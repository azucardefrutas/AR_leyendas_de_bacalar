export default class LegacyCompositionBlockTool {
  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data }) {
    this.data = data || {};
  }

  render() {
    const notice = document.createElement('p');
    notice.className = 'ejs-legacy-composition-notice';
    notice.textContent = 'Esta composición antigua contiene un recurso no compatible. Sus datos se conservarán al guardar.';
    return notice;
  }

  save() {
    return this.data;
  }

  validate() {
    return true;
  }
}
