import React from 'react';
import LegalDocumentPage from './LegalDocumentPage.jsx';

const sections = [
  {
    title: '1. Responsable y alcance',
    paragraphs: [
      'Leyendas de Bacalar, como proyecto academico en revision, tratara datos personales de lectores y usuarios registrados para operar la plataforma.',
      'La identidad juridica, domicilio y correo definitivo del responsable deberan completarse antes de operar en produccion.',
    ],
  },
  {
    title: '2. Datos personales tratados',
    paragraphs: [
      'La plataforma puede tratar datos de identificacion y contacto, como nombre, correo electronico, identificador de cuenta y configuracion de perfil.',
      'Tambien puede registrar datos de uso relacionados con biblioteca, progreso de lectura, favoritos, reseñas, codigos canjeados, compras, suscripciones y accesos habilitados.',
    ],
  },
  {
    title: '3. Finalidades necesarias',
    paragraphs: [
      'Los datos se usan para crear y administrar cuentas, gestionar biblioteca, validar codigos de acceso, habilitar contenido, brindar soporte y mantener la seguridad de la plataforma.',
      'Cuando existan compras, suscripciones o accesos, la informacion se utilizara para registrar la operacion y permitir el contenido correspondiente.',
    ],
  },
  {
    title: '4. Finalidades opcionales',
    paragraphs: [
      'El envio de informacion cultural, novedades, invitaciones o comunicaciones promocionales debera tratarse como finalidad opcional y separada de las necesarias.',
      'El usuario no debe quedar inscrito por defecto a finalidades promocionales o de marketing.',
    ],
  },
  {
    title: '5. Codigos, compras y suscripciones',
    paragraphs: [
      'Cuando el usuario canjea un codigo, compra contenido o activa una suscripcion, el sistema puede registrar datos necesarios para acreditar y administrar ese acceso.',
      'No se debe solicitar ni conservar informacion innecesaria, como documentos oficiales para lectores comunes o datos sensibles de tarjeta no requeridos por el flujo.',
    ],
  },
  {
    title: '6. Derechos ARCO y revocacion',
    paragraphs: [
      'La persona usuaria puede solicitar acceso, rectificacion, cancelacion u oposicion respecto de sus datos personales, asi como revocar su consentimiento para finalidades no necesarias.',
      'El canal definitivo para ejercer estos derechos debera publicarse en la version final del aviso de privacidad.',
    ],
  },
  {
    title: '7. Seguridad, conservacion y cambios',
    paragraphs: [
      'La plataforma procurara aplicar medidas administrativas, tecnicas y de acceso para proteger los datos personales y conservarlos solo mientras sean necesarios para las finalidades informadas.',
      'Este aviso puede actualizarse conforme el proyecto incorpore nuevas funciones. La version vigente estara disponible en esta ruta.',
    ],
  },
  {
    title: '8. Marco legal de referencia',
    paragraphs: [
      'Este aviso se inspira en la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares, su Reglamento y la Guia para el Aviso de Privacidad del INAI.',
      'Si el proyecto fuera operado directamente por una entidad publica o sujeto obligado, el marco aplicable podria requerir ajustes adicionales.',
    ],
  },
];

function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Aviso de privacidad para lectores"
      intro="Este aviso describe como se recopila, utiliza y protege la informacion de visitantes, lectores y usuarios registrados."
      sections={sections}
    />
  );
}

export default PrivacyPage;
