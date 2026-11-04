import {restoreJourney} from './journey-model.mjs';

export function certificateEligible(definition,state){
  if(definition.certificate?.status!=='enabled'||!definition.chapters?.length)return false;
  return restoreJourney(definition,state).done.length===definition.chapters.length;
}
export function normalizeCertificateName(value){
  const name=String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');
  if(name.length>120||name.split(' ').length<2||!name.split(' ').every(part=>/\p{L}/u.test(part))||! /^[\p{L}\p{M} .'’\-]+$/u.test(name))throw new Error('Informe seu nome completo, com nome e sobrenome, em até 120 caracteres.');
  return name;
}
export function certificateDate(date=new Date()){
  if(!Number.isFinite(date.getTime()))throw new Error('Data inválida.');
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(date);
}
