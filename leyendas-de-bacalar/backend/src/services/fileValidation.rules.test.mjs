import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateFileMetadata,
  getAssetRegistrationPolicy,
} from './fileValidation.service.js';

const MB = 1024 * 1024;

// --- Casos válidos por propósito -------------------------------------------

test('acepta un PDF de documento fuente dentro del límite de 50 MB', () => {
  const result = validateFileMetadata({
    filename: 'leyenda-del-pixan.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 40 * MB,
    purpose: 'source_document',
  });

  assert.equal(result.ok, true);
  assert.equal(result.normalized.purpose, 'source_document');
});

test('acepta un PDF reportado como application/octet-stream por su extensión', () => {
  const result = validateFileMetadata({
    filename: 'documento.pdf',
    mimeType: 'application/octet-stream',
    sizeBytes: 2 * MB,
    purpose: 'source_document',
  });

  assert.equal(result.ok, true);
});

test('acepta un DOCX de documento fuente', () => {
  const result = validateFileMetadata({
    filename: 'obra.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 1 * MB,
    purpose: 'source_document',
  });

  assert.equal(result.ok, true);
});

test('acepta una portada JPEG', () => {
  const result = validateFileMetadata({
    filename: 'portada.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 500_000,
    purpose: 'cover',
  });

  assert.equal(result.ok, true);
});

test('normaliza el mimeType a minúsculas y recorta espacios', () => {
  const result = validateFileMetadata({
    filename: '  banner.png  ',
    mimeType: '  IMAGE/PNG  ',
    sizeBytes: 300_000,
    purpose: 'banner',
  });

  assert.equal(result.ok, true);
  assert.equal(result.normalized.mimeType, 'image/png');
  assert.equal(result.normalized.filename, 'banner.png');
});

// --- Casos de rechazo (deben lanzar FileValidationError, statusCode 400) ----

test('rechaza un propósito no soportado', () => {
  assert.throws(
    () =>
      validateFileMetadata({
        filename: 'x.png',
        mimeType: 'image/png',
        sizeBytes: 1000,
        purpose: 'purpose_inexistente',
      }),
    (error) => {
      assert.equal(error.name, 'FileValidationError');
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /unsupported purpose/);
      return true;
    },
  );
});

test('rechaza un archivo que excede el tamaño máximo', () => {
  assert.throws(
    () =>
      validateFileMetadata({
        filename: 'enorme.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 60 * MB,
        purpose: 'source_document',
      }),
    /file too large/,
  );
});

test('rechaza tamaño cero o negativo', () => {
  assert.throws(
    () =>
      validateFileMetadata({
        filename: 'vacio.png',
        mimeType: 'image/png',
        sizeBytes: 0,
        purpose: 'cover',
      }),
    /empty filename or size/,
  );
});

test('rechaza metadatos malformados (sizeBytes no numérico)', () => {
  assert.throws(
    () =>
      validateFileMetadata({
        filename: 'x.png',
        mimeType: 'image/png',
        sizeBytes: 'mucho',
        purpose: 'cover',
      }),
    /missing or malformed fields/,
  );
});

test('rechaza un tipo de imagen no permitido (gif)', () => {
  assert.throws(
    () =>
      validateFileMetadata({
        filename: 'animado.gif',
        mimeType: 'image/gif',
        sizeBytes: 1000,
        purpose: 'cover',
      }),
    /unsupported file type/,
  );
});

test('rechaza un octet-stream para modelo 3D con extensión inválida', () => {
  assert.throws(
    () =>
      validateFileMetadata({
        filename: 'modelo.txt',
        mimeType: 'application/octet-stream',
        sizeBytes: 1000,
        purpose: 'model_3d',
      }),
    /unsupported file type/,
  );
});

test('acepta un GLTF+JSON válido para modelo 3D', () => {
  const result = validateFileMetadata({
    filename: 'escena.gltf',
    mimeType: 'model/gltf+json',
    sizeBytes: 3 * MB,
    purpose: 'model_3d',
  });

  assert.equal(result.ok, true);
});

// --- Política de registro de assets ----------------------------------------

test('mapea propósitos desconocidos a una política por defecto', () => {
  assert.deepEqual(getAssetRegistrationPolicy('cover'), {
    assetType: 'cover',
    metadataKind: 'cover',
    metadataContext: null,
  });
});
