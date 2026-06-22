export interface Device {
  id: string;
  name: string;
  deviceType: 'desktop' | 'tablet' | 'phone';
  browser: string;
  os: string;
  colorHash: string;
}
