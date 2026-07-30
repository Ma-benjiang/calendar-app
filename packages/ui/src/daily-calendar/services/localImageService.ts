interface DesktopImageBridge {
  persist(payload: { source: string; label: string }): Promise<string>;
  remove(imageURL: string): Promise<boolean>;
}

function getDesktopImageBridge(): DesktopImageBridge | undefined {
  return typeof window !== 'undefined'
    ? (window as unknown as {
        calendarDesktop?: { images?: DesktopImageBridge };
      }).calendarDesktop?.images
    : undefined;
}

export async function persistCalendarImage(
  source: string,
  label: string
): Promise<string> {
  const bridge = getDesktopImageBridge();
  return bridge ? bridge.persist({ source, label }) : source;
}

export async function removeCalendarImage(imageURL?: string): Promise<void> {
  const bridge = getDesktopImageBridge();
  if (bridge && imageURL) {
    await bridge.remove(imageURL);
  }
}
