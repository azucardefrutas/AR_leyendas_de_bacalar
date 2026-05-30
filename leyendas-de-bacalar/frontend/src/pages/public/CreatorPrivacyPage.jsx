import React from 'react';
import LegalDocumentPage from './LegalDocumentPage.jsx';

const sections = [
  {
    title: '1. Alcance del aviso',
    paragraphs: [
      'Este aviso aplica a personas que solicitan convertirse en creadoras, autores aprobados y usuarios que administran obras dentro de Leyendas de Bacalar.',
      'El aviso de privacidad para creadores es separado del aviso de lectores porque las finalidades, datos y riesgos son distintos.',
    ],
  },
  {
    title: '2. Datos personales tratados',
    paragraphs: [
      'La plataforma puede tratar nombre, correo electronico, ciudad o pais, seudonimo, biografia, datos de contacto, datos de cuenta y estado de solicitud.',
      'Si en una fase futura se solicita verificacion reforzada, podrian tratarse documentos o evidencias de identidad y titularidad, siempre que exista justificacion y aviso actualizado.',
    ],
  },
  {
    title: '3. Finalidades necesarias',
    paragraphs: [
      'Los datos se usan para revisar solicitudes de creador, administrar perfiles de autor, evaluar obras, gestionar revisiones editoriales y mantener trazabilidad de publicaciones.',
      'Tambien pueden usarse para atender reclamaciones de derechos de autor, verificar declaraciones de titularidad, conservar evidencia de aceptaciones y proteger la seguridad del sistema.',
    ],
  },
  {
    title: '4. Obras, recursos y evidencias',
    paragraphs: [
      'La plataforma puede conservar metadatos, archivos, enlaces, documentos fuente, marcadores AR, modelos 3D y registros asociados a obras enviadas o publicadas.',
      'Estos registros ayudan a revisar contenido, acreditar historial de cambios, atender reclamos y documentar decisiones administrativas.',
    ],
  },
  {
    title: '5. Transferencias y proveedores',
    paragraphs: [
      'Los datos pueden tratarse mediante proveedores tecnologicos necesarios para autenticacion, almacenamiento, base de datos, seguridad y operacion de la plataforma.',
      'No se realizaran transferencias ajenas a las finalidades informadas salvo obligacion legal, autorizacion del titular o necesidades tecnicas debidamente justificadas.',
    ],
  },
  {
    title: '6. Biometria y documentos sensibles',
    paragraphs: [
      'En esta etapa no se implementa verificacion biometrica ni carga obligatoria de documentos oficiales para creadores.',
      'Si el proyecto incorpora selfies, biometria, reconocimiento facial o documentos de identidad, el aviso debera actualizarse antes de recabar esos datos.',
    ],
  },
  {
    title: '7. Derechos y contacto',
    paragraphs: [
      'La persona creadora puede solicitar acceso, rectificacion, cancelacion u oposicion respecto de sus datos personales y revocar consentimientos no necesarios.',
      'El canal definitivo de contacto y el procedimiento ARCO deberan completarse antes de operar el sistema en produccion.',
    ],
  },
  {
    title: '8. Conservacion y seguridad',
    paragraphs: [
      'La informacion se conservara mientras sea necesaria para administrar la cuenta de creador, revisar obras, atender reclamos, preservar evidencia y cumplir finalidades legales o academicas.',
      'La plataforma aplicara medidas razonables de seguridad y restringira el acceso a personal o usuarios con permisos administrativos correspondientes.',
    ],
  },
];

function CreatorPrivacyPage() {
  return (
    <LegalDocumentPage
      title="Aviso de privacidad para creadores"
      intro="Este aviso explica el tratamiento de datos personales de autores y solicitantes de creador dentro de Leyendas de Bacalar."
      sections={sections}
    />
  );
}

export default CreatorPrivacyPage;
