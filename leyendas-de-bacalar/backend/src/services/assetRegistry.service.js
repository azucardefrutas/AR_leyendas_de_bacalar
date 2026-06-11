import { Buffer } from 'node:buffer';

import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getPdfPageCountFromBuffer } from './documentTextExtractor.service.js';

class AssetRegistryError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'AssetRegistryError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const getExtension = (filename) => {
  const parts = String(filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const getAssetType = ({ purpose, filename }) => {
  if (purpose === 'source_document') {
    const extension = getExtension(filename);
    if (extension === 'pdf') return 'pdf';
    if (extension === 'doc' || extension === 'docx') return 'docx';
    return 'other';
  }

  return purpose;
};

const getDocumentType = ({ filename, mimeType }) => {
  const extension = getExtension(filename);

  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (
    extension === 'doc' ||
    extension === 'docx' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  return 'other';
};

const getMediaUsageContext = (purpose) => (purpose === 'cover' ? 'catalog' : 'detail');

const buildLegendMediaPayload = ({ legendId, assetId, purpose }) => ({
  legend_id: legendId,
  asset_id: assetId,
  media_type: purpose,
  usage_context: getMediaUsageContext(purpose),
  is_primary: true,
});

const logAssetRegistryDebug = (message, payload = {}) => {
  if (process.env.NODE_ENV === 'production') return;

  console.info('[asset-registry]', message, payload);
};

const logAssetRegistryError = (message, payload = {}) => {
  if (process.env.NODE_ENV === 'production') return;

  console.error('[asset-registry]', message, payload);
};

const insertAsset = async ({
  userId,
  legendId,
  purpose,
  bucket,
  path,
  filename,
  mimeType,
  sizeBytes,
  publicUrl,
}) => {
  const payload = {
    uploaded_by: userId,
    asset_type: getAssetType({ purpose, filename }),
    source_type: 'upload',
    file_url: bucket === 'legend-assets' ? publicUrl || null : null,
    storage_path: path,
    external_url: null,
    mime_type: mimeType,
    file_size: sizeBytes,
    metadata: {
      bucket,
      legend_id: legendId,
      kind: purpose,
      original_name: filename,
      public: bucket === 'legend-assets',
    },
  };

  const { data, error } = await supabaseAdmin.from('assets').insert(payload).select().single();

  if (error || !data) {
    throw new AssetRegistryError('Could not register asset.', 500, {
      table: 'assets',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
  }

  return data;
};

const findLegendMedia = async ({ legendId, purpose }) => {
  const mediaType = purpose;
  const usageContext = getMediaUsageContext(purpose);

  const { data, error } = await supabaseAdmin
    .from('legend_media')
    .select('id')
    .eq('legend_id', legendId)
    .eq('media_type', mediaType)
    .eq('usage_context', usageContext)
    .maybeSingle();

  if (error) {
    throw new AssetRegistryError('Could not load legend media relation.', 500, {
      table: 'legend_media',
      code: error.code,
      reason: error.message,
      details: error.details,
      hint: error.hint,
      payload: {
        legend_id: legendId,
        media_type: mediaType,
        usage_context: usageContext,
      },
    });
  }

  return data;
};

const updateLegendMedia = async ({ relationId, assetId }) => {
  const payload = {
    asset_id: assetId,
    is_primary: true,
  };

  const { data, error } = await supabaseAdmin
    .from('legend_media')
    .update(payload)
    .eq('id', relationId)
    .select()
    .single();

  if (error || !data) {
    throw new AssetRegistryError('Could not update legend media.', 500, {
      table: 'legend_media',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
      payload,
    });
  }

  return {
    type: 'legend_media',
    id: data.id,
    action: 'updated',
  };
};

const insertLegendMedia = async (payload) => {
  const { data, error } = await supabaseAdmin.from('legend_media').insert(payload).select().single();

  if (error || !data) {
    throw new AssetRegistryError('Could not link legend media.', 500, {
      table: 'legend_media',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
      payload,
    });
  }

  return {
    type: 'legend_media',
    id: data.id,
    action: 'inserted',
  };
};

const linkLegendMedia = async ({ legendId, assetId, purpose }) => {
  const payload = buildLegendMediaPayload({ legendId, assetId, purpose });
  const existingRelation = await findLegendMedia({ legendId, purpose });

  if (existingRelation?.id) {
    return updateLegendMedia({ relationId: existingRelation.id, assetId });
  }

  return insertLegendMedia(payload);
};

const detectPdfPageCount = async ({ bucket, path, filename, mimeType }) => {
  if (getDocumentType({ filename, mimeType }) !== 'pdf') {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);

    if (error || !data) {
      console.warn('[warn] Could not download PDF to detect page_count.', {
        bucket,
        path,
        reason: error?.message,
      });
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    // IMPORTANT: await here so a pdf-parse rejection is caught below instead of
    // escaping this best-effort helper and turning register-upload into a 500.
    return await getPdfPageCountFromBuffer(Buffer.from(arrayBuffer));
  } catch (error) {
    console.warn('[warn] Could not detect PDF page_count.', {
      bucket,
      path,
      reason: error?.message,
    });
    return null;
  }
};

const linkSourceDocument = async ({ legendId, assetId, userId, filename, mimeType, pageCount }) => {
  const payload = {
    legend_id: legendId,
    asset_id: assetId,
    uploaded_by: userId,
    document_type: getDocumentType({ filename, mimeType }),
    is_primary_source: true,
    extraction_status: 'pending',
    page_count: pageCount,
  };

  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    logAssetRegistryError('source_document relation insert failed', {
      payload,
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
    });

    throw new AssetRegistryError('Could not link source document.', 500, {
      table: 'legend_source_documents',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
      payload,
    });
  }

  logAssetRegistryDebug('source_document relation inserted', {
    id: data.id,
    legend_id: data.legend_id,
    asset_id: data.asset_id,
    document_type: data.document_type,
    extraction_status: data.extraction_status,
    page_count: data.page_count ?? null,
  });

  return {
    type: 'legend_source_documents',
    id: data.id,
    pageCount: data.page_count ?? null,
  };
};

export const registerUploadedAsset = async ({
  userId,
  legendId,
  purpose,
  bucket,
  path,
  filename,
  mimeType,
  sizeBytes,
  publicUrl,
}) => {
  const asset = await insertAsset({
    userId,
    legendId,
    purpose,
    bucket,
    path,
    filename,
    mimeType,
    sizeBytes,
    publicUrl,
  });

  if (purpose === 'cover' || purpose === 'banner') {
    try {
      const relation = await linkLegendMedia({ legendId, assetId: asset.id, purpose });
      return { asset, relation };
    } catch (error) {
      await supabaseAdmin.from('assets').delete().eq('id', asset.id);
      throw error;
    }
  }

  if (purpose === 'source_document') {
    try {
      const pageCount = await detectPdfPageCount({
        bucket,
        path,
        filename,
        mimeType,
      });
      const relation = await linkSourceDocument({
        legendId,
        assetId: asset.id,
        userId,
        filename,
        mimeType,
        pageCount,
      });
      return { asset, relation };
    } catch (error) {
      // Avoid leaving an orphan asset row if linking the source document fails,
      // matching the cover/banner cleanup behavior above.
      await supabaseAdmin.from('assets').delete().eq('id', asset.id);
      throw error;
    }
  }

  return {
    asset,
    relation: {
      type: 'assets_only',
    },
  };
};
