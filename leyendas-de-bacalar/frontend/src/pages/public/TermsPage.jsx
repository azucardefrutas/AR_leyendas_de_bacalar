import React from 'react';
import LegalDocumentPage from './LegalDocumentPage.jsx';

const sections = [
  {
    title: '1. Objeto del servicio',
    paragraphs: [
      'Leyendas de Bacalar es una plataforma cultural y academica para consultar, leer y preservar relatos vinculados con Bacalar y su comunidad.',
      'El servicio permite explorar, leer y, cuando aplique, activar contenidos culturales relacionados con leyendas, relatos y materiales del proyecto.',
    ],
  },
  {
    title: '2. Acceso publico y cuenta',
    paragraphs: [
      'Parte del contenido puede consultarse sin crear cuenta. Para guardar biblioteca, activar codigos, recibir funcionalidades personalizadas o acceder a servicios adicionales, sera necesario registrarse.',
      'Al crear una cuenta, la persona usuaria se compromete a proporcionar datos de registro veraces, mantener segura su contrasena y no usar cuentas ajenas sin autorizacion.',
    ],
  },
  {
    title: '3. Uso permitido',
    paragraphs: [
      'La cuenta y los contenidos pueden utilizarse para fines personales, educativos, culturales o de lectura, salvo autorizacion expresa distinta por escrito.',
      'Queda prohibido copiar, redistribuir, revender, extraer masivamente, alterar mecanismos de acceso o utilizar la plataforma para conductas ilicitas, fraudulentas o que lesionen derechos de terceros.',
    ],
  },
  {
    title: '4. Propiedad intelectual del servicio',
    paragraphs: [
      'Los textos, imagenes, marcas, diseno de interfaz, compilaciones y demas elementos del servicio pertenecen a sus respectivos titulares.',
      'Dichos elementos solo podran utilizarse conforme a estos terminos y a la ley aplicable.',
    ],
  },
  {
    title: '5. Codigos, compras y accesos',
    paragraphs: [
      'Si la plataforma permite canjear codigos, cada codigo estara sujeto a sus reglas de activacion, vigencia, uso individual y validacion tecnica.',
      'Si existen compras, suscripciones o accesos digitales, se mostraran condiciones, costos, cargos aplicables, medios de contacto y mecanismos de cancelacion cuando correspondan.',
    ],
  },
  {
    title: '6. Cambios, mantenimiento y disponibilidad',
    paragraphs: [
      'La plataforma podra actualizar, suspender o modificar funcionalidades por mantenimiento, seguridad, cumplimiento legal o mejora del servicio.',
      'Cuando sea razonable, se procurara informar cambios relevantes que afecten el acceso o uso de la plataforma.',
    ],
  },
  {
    title: '7. Suspension de cuenta',
    paragraphs: [
      'La plataforma podra suspender o restringir accesos cuando detecte uso indebido, fraude, ataques al sistema o incumplimientos graves a estos terminos.',
      'La suspension buscara proteger a usuarios, creadores, contenidos y la integridad tecnica del proyecto.',
    ],
  },
  {
    title: '8. Contacto y aclaraciones',
    paragraphs: [
      'La persona usuaria contara con medios visibles de contacto para aclaraciones, solicitudes o reportes relacionados con la plataforma.',
      'Estos terminos forman parte de una version academica inicial y podran ajustarse conforme avance la revision legal del proyecto.',
    ],
  },
];

function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terminos y condiciones para lectores"
      intro="Estos terminos explican las reglas basicas para usar Leyendas de Bacalar como lector, visitante o usuario registrado."
      sections={sections}
    />
  );
}

export default TermsPage;
