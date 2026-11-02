import {survey} from '../../server/survey-definition.mjs';
import {states} from '../../assets/states.mjs';

export const RELEASE_SIZE=5;
const reply=(status,value)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Allow':'GET'}});
// Fixed cohorts avoid publishing changes in individual answers after every new submission.
const eligible=`WITH eligible AS (
  SELECT id FROM survey_submissions WHERE survey_id=?1 AND survey_version=?2 ORDER BY rowid
  LIMIT (SELECT count(*) - count(*) % ${RELEASE_SIZE} FROM survey_submissions WHERE survey_id=?1 AND survey_version=?2)
)`;
export async function onRequest({request,env}){
  if(request.method!=='GET')return reply(405,{ok:false,error:'Método não permitido.'});
  if(new URL(request.url).search)return reply(400,{ok:false,error:'Os resultados são nacionais e não aceitam filtros.'});
  if(!env.DB?.prepare||!env.DB?.batch)return reply(503,{ok:false,error:'Resultados temporariamente indisponíveis.'});
  try{
    const statement=sql=>env.DB.prepare(sql).bind(survey.id,survey.version);
    const result=await env.DB.batch([
      statement('SELECT count(*) AS total FROM survey_submissions WHERE survey_id=?1 AND survey_version=?2'),
      statement('SELECT uf,count(*) AS count FROM survey_submissions WHERE survey_id=?1 AND survey_version=?2 GROUP BY uf'),
      statement(`${eligible} SELECT a.question_id,count(*) AS answered FROM survey_answers a JOIN eligible e ON e.id=a.submission_id GROUP BY a.question_id`),
      statement(`${eligible} SELECT a.question_id,CAST(j.value AS INTEGER) AS choice,count(DISTINCT a.submission_id) AS count FROM survey_answers a JOIN eligible e ON e.id=a.submission_id JOIN json_each(a.value_json) j GROUP BY a.question_id,j.value`)
    ]);
    const total=Number(result[0].results[0].total),sampleSize=total-total%RELEASE_SIZE;
    const byState=states.map(s=>({uf:s.uf,count:Number(result[1].results.find(row=>row.uf===s.uf)?.count||0)}));
    const located=byState.reduce((sum,s)=>sum+s.count,0);
    const questions=survey.questions.map(q=>{
      const answered=Number(result[2].results.find(row=>row.question_id===q.id)?.answered||0);
      const locked=answered<RELEASE_SIZE;
      const choices=q.type==='scale'?Array.from({length:q.max-q.min+1},(_,i)=>({value:q.min+i,label:String(q.min+i)})):q.options.map((label,value)=>({value,label}));
      const options=locked?[]:choices.map(choice=>{
        const count=Number(result[3].results.find(row=>row.question_id===q.id&&row.choice===choice.value)?.count||0);
        return {...choice,count,percentage:Math.round(count/answered*1000)/10};
      });
      return {id:q.id,section:q.section,title:q.title,type:q.type,answered,skipped:sampleSize-answered,locked,options,...(!locked&&q.type==='scale'?{average:Math.round(options.reduce((sum,o)=>sum+o.value*o.count,0)/answered*10)/10}:{})};
    });
    return reply(200,{ok:true,surveyId:survey.id,version:survey.version,total,located,unlocated:total-located,byState,results:{sampleSize,releaseSize:RELEASE_SIZE,questions}});
  }catch{return reply(503,{ok:false,error:'Não foi possível carregar os resultados agora.'});}
}
