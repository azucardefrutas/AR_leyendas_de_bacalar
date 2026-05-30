import React from 'react';
import LegalDocumentPage from './LegalDocumentPage.jsx';

const sections = [
  {
    title: '1. Identidad verdadera del creador',
    paragraphs: [
      'La persona que solicite o mantenga una cuenta de creador declara que su identidad, datos de contacto y documentacion de verificacion son veraces, completos y actuales.',
      'La presentacion de informacion falsa, alterada o ajena puede causar rechazo de solicitud, suspension de publicaciones o cancelacion de privilegios de creador.',
    ],
  },
  {
    title: '2. Declaracion de autoria o cadena de derechos',
    paragraphs: [
      'La persona creadora declara, bajo protesta de decir verdad, que es autora de la obra o que cuenta con autorizaciones, cesiones o licencias suficientes para publicarla.',
      'Esa declaracion cubre la reproduccion, comunicacion publica, puesta a disposicion, distribucion y uso tecnico de la obra dentro de la plataforma.',
    ],
  },
  {
    title: '3. Contenido prohibido',
    paragraphs: [
      'No se podran publicar obras o materiales que infrinjan derechos de autor, derechos conexos, derechos de imagen, privacidad, datos personales, secreto profesional, normas penales o cualquier derecho de tercero.',
      'La responsabilidad del creador incluye textos, portadas, banners, PDFs, archivos 3D, marcadores AR, enlaces externos y cualquier recurso asociado a una leyenda.',
    ],
  },
  {
    title: '4. Relatos tradicionales y patrimonio cultural',
    paragraphs: [
      'Cuando una obra adapte o use relatos tradicionales, expresiones culturales o elementos vinculados al patrimonio cultural de pueblos o comunidades indigenas o afromexicanas, la persona creadora debera identificar origen, contexto y autorizaciones aplicables.',
      'La plataforma podra solicitar informacion adicional para evitar apropiacion indebida y procurar atribucion adecuada cuando corresponda.',
    ],
  },
  {
    title: '5. Licencia a favor de la plataforma',
    paragraphs: [
      'La persona creadora otorga a Leyendas de Bacalar una licencia no exclusiva para alojar, reproducir tecnicamente, convertir de formato, mostrar, comunicar publicamente y poner a disposicion la obra dentro del servicio.',
      'La plataforma procurara respetar el credito autoral y la integridad de la obra; cualquier ajuste tecnico o editorial no debera desnaturalizar el contenido sin base contractual o legal.',
    ],
  },
  {
    title: '6. Revision administrativa',
    paragraphs: [
      'La aprobacion como creador y la publicacion de obras estaran sujetas a revision editorial y de cumplimiento.',
      'La plataforma podra aprobar, rechazar, solicitar cambios, ocultar, retirar o suspender contenido cuando existan dudas de calidad, permisos, seguridad, titularidad o cumplimiento de estos terminos.',
    ],
  },
  {
    title: '7. Aviso, retiro y contra-aviso',
    paragraphs: [
      'La plataforma podra remover, retirar, inhabilitar o suspender contenido cuando reciba aviso de probable infraccion, resolucion de autoridad o detecte incumplimientos evidentes.',
      'La persona creadora podra presentar evidencia de titularidad o autorizacion para que la administracion revise el caso.',
    ],
  },
  {
    title: '8. Infractores reincidentes y responsabilidad',
    paragraphs: [
      'La plataforma podra suspender o terminar cuentas de creadores con infracciones reiteradas o reclamaciones fundadas.',
      'La persona creadora respondera frente a reclamaciones derivadas de falsedad en sus declaraciones o de falta de derechos suficientes sobre la obra, en los terminos permitidos por la ley aplicable.',
    ],
  },
  {
    title: '9. Conservacion de evidencias',
    paragraphs: [
      'La plataforma podra conservar metadatos, registros de aceptacion, evidencia tecnica y documentacion asociada a procesos de verificacion, revision y atencion de reclamaciones.',
      'Estas evidencias se trataran conforme al aviso de privacidad para creadores y a la normativa aplicable.',
    ],
  },
];

function CreatorTermsPage() {
  return (
    <LegalDocumentPage
      title="Terminos y condiciones para creadores"
      intro="Estos terminos establecen las responsabilidades y condiciones para publicar contenido como creador en Leyendas de Bacalar."
      sections={sections}
    />
  );
}

export default CreatorTermsPage;
