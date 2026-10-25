export async function copyLatex(text: string, source: HTMLTextAreaElement): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('unavailable');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    source.focus();
    source.select();
    source.setSelectionRange(0, source.value.length);
    return false;
  }
}
