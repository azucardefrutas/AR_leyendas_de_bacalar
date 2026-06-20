// Custom Editor.js block tools for "crear desde cero" stories: insert a 3D model or a
// marker as a light inline card that references an already-uploaded asset (no heavy GLB
// in the editor). The preview (EditorJsPreview) renders these as cards / "Ver modelo".
// These are independent from the PDF hotspot/marker system.

const ICONS = {
  model3d: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>',
  marker: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
};

export function makeAssetCardTool({ kind, toolTitle }) {
  return class AssetCardTool {
    static get toolbox() {
      return { title: toolTitle, icon: ICONS[kind] || ICONS.model3d };
    }

    static get isReadOnlySupported() {
      return true;
    }

    constructor({ data, config, readOnly }) {
      this.readOnly = Boolean(readOnly);
      this.config = config || {};
      this.data = {
        assetId: data?.assetId || '',
        title: data?.title || toolTitle,
        caption: data?.caption || '',
        displayMode: data?.displayMode || 'inline-card',
      };
    }

    render() {
      const assets = Array.isArray(this.config.assets) ? this.config.assets : [];
      const wrapper = document.createElement('div');
      wrapper.className = `ejs-tool-card ejs-tool-card--${kind}`;

      const head = document.createElement('div');
      head.className = 'ejs-tool-card__head';
      const icon = document.createElement('span');
      icon.className = 'ejs-tool-card__icon';
      icon.innerHTML = ICONS[kind] || ICONS.model3d;
      const label = document.createElement('strong');
      label.textContent = toolTitle;
      head.append(icon, label);
      wrapper.appendChild(head);

      if (this.readOnly) {
        const info = document.createElement('div');
        info.className = 'ejs-tool-card__readonly';
        info.textContent = this.data.title || toolTitle;
        wrapper.appendChild(info);
        return wrapper;
      }

      const select = document.createElement('select');
      select.className = 'ejs-tool-card__select';
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = assets.length ? 'Selecciona un recurso…' : 'No hay recursos disponibles';
      select.appendChild(empty);
      for (const asset of assets) {
        const option = document.createElement('option');
        option.value = asset.id;
        option.textContent = asset.name || asset.id;
        if (String(asset.id) === String(this.data.assetId)) option.selected = true;
        select.appendChild(option);
      }
      select.addEventListener('change', (event) => {
        this.data.assetId = event.target.value;
        const found = assets.find((asset) => String(asset.id) === String(event.target.value));
        if (found && (!this.data.title || this.data.title === toolTitle)) {
          this.data.title = found.name || toolTitle;
        }
      });
      wrapper.appendChild(select);

      const caption = document.createElement('input');
      caption.className = 'ejs-tool-card__caption';
      caption.placeholder = 'Descripción (opcional)';
      caption.value = this.data.caption;
      caption.addEventListener('input', (event) => { this.data.caption = event.target.value; });
      wrapper.appendChild(caption);

      return wrapper;
    }

    save() {
      return { ...this.data };
    }

    static get sanitize() {
      return { assetId: false, title: false, caption: false, displayMode: false };
    }
  };
}
