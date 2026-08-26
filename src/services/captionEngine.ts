export interface CaptionStyleOptions {
  style?: string; // 'tiktok_pop' | 'karaoke' | 'bold_stroke' | 'bounce' | 'minimal'
  font?: string;
  color?: string;
  fontSize?: number;
}

export const captionEngine = {
  drawCaptions(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    progress: number = 0,
    options: CaptionStyleOptions = {}
  ) {
    if (!text || !text.trim()) return;

    const style = options.style || 'tiktok_pop';
    const font = options.font || 'Arial Black, Impact, sans-serif';
    const color = options.color || '#FFFF00';
    const fontSize = options.fontSize || Math.floor(width * 0.065);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = width / 2;
    const y = height * 0.78; // Standard vertical shorts caption positioning

    // Wrap text into multiple lines if needed
    const words = text.toUpperCase().trim().split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      ctx.font = `900 ${fontSize}px ${font}`;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width * 0.85 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.25;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;

      if (style === 'tiktok_pop') {
        // Pop zoom animation based on progress
        const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.06;
        ctx.save();
        ctx.translate(x, lineY);
        ctx.scale(scale, scale);

        // Heavy dark shadow & stroke
        ctx.lineWidth = Math.max(4, Math.floor(fontSize * 0.16));
        ctx.strokeStyle = '#000000';
        ctx.strokeText(line, 0, 0);

        ctx.fillStyle = color;
        ctx.fillText(line, 0, 0);
        ctx.restore();
      } else if (style === 'karaoke') {
        // Word highlight
        ctx.lineWidth = Math.max(4, Math.floor(fontSize * 0.14));
        ctx.strokeStyle = '#000000';
        ctx.strokeText(line, x, lineY);

        ctx.fillStyle = progress > 0.5 ? color : '#FFFFFF';
        ctx.fillText(line, x, lineY);
      } else {
        // Bold Stroke / Standard
        ctx.lineWidth = Math.max(4, Math.floor(fontSize * 0.14));
        ctx.strokeStyle = '#000000';
        ctx.strokeText(line, x, lineY);

        ctx.fillStyle = color;
        ctx.fillText(line, x, lineY);
      }
    });

    ctx.restore();
  },
};
