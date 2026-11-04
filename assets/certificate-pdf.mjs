// A single A4 landscape page with a high-resolution image. Byte offsets and
// stream lengths use encoded bytes, including the original JPEG stream.
export function certificatePdf(jpeg,width,height){
  if(!(jpeg instanceof Uint8Array)||jpeg[0]!==255||jpeg[1]!==216||!Number.isSafeInteger(width)||width<=0||!Number.isSafeInteger(height)||height<=0)throw new Error('Imagem do certificado inválida.');
  const encode=value=>new TextEncoder().encode(value),parts=[],offsets=[0];let size=0;
  const append=part=>{const bytes=typeof part==='string'?encode(part):part;parts.push(bytes);size+=bytes.length;};
  const object=(id,body)=>{offsets[id]=size;append(`${id} 0 obj\n`);append(body);append('\nendobj\n');};
  append('%PDF-1.4\n%');append(new Uint8Array([226,227,207,211]));append('\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Certificate 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4]=size;append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);append(jpeg);append('\nendstream\nendobj\n');
  const content='q\n841.89 0 0 595.28 0 0 cm\n/Certificate Do\nQ\n';
  object(5,`<< /Length ${encode(content).length} >>\nstream\n${content}endstream`);
  const xref=size;
  append('xref\n0 6\n0000000000 65535 f \n');
  for(let id=1;id<=5;id++)append(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}
