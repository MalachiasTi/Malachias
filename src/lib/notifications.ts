
export const playNotificationSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play blocked by browser policy'));
  } catch (error) {
    console.error("Error playing sound:", error);
  }
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }
  }
  return Notification.permission;
};

export const showSystemNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2224%22 fill=%22%231d4ed8%22/><text y=%2250%%22 font-size=%2270%22 font-weight=%22900%22 font-family=%22system-ui, sans-serif%22 fill=%22white%22 x=%2250%%22 text-anchor=%22middle%22 dy=%22.35em%22>M</text></svg>'
      });
    } catch (error) {
      console.error("Error showing system notification:", error);
    }
  }
};
