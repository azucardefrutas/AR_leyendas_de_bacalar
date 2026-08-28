export const EMOTES_PER_PAGE = 6;

export function getEmoteWheelPage(clips, page, size) {
  const pageCount = Math.max(1, Math.ceil(clips.length / EMOTES_PER_PAGE));
  const pageIndex = Math.max(0, Math.min(pageCount - 1, page));
  const items = clips.slice(pageIndex * EMOTES_PER_PAGE, (pageIndex + 1) * EMOTES_PER_PAGE);
  const width = Math.min(80, size * 0.25);
  const height = 60;
  const radius = (size - Math.max(width, height) - 12) / 2;
  return {
    pageIndex, pageCount,
    items: items.map((clip, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / items.length;
      return { clip, width, height, left: size / 2 + Math.cos(angle) * radius - width / 2, top: size / 2 + Math.sin(angle) * radius - height / 2 };
    }),
  };
}
