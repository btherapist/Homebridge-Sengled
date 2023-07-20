import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import axios, { AxiosResponse, AxiosError } from 'axios';

interface SengledDevice {
  id: string;
  name: string;
  // Add more device properties as needed
}

interface SengledAPIResponse {
  devices: SengledDevice[];
  // Add more response properties as needed
}

class SengledPlatform implements DynamicPlatformPlugin {
  private readonly log: Logger;
  private readonly api: API;

  private readonly username: string;
  private readonly password: string;
  private accessToken: string | null = null; // Store the access token as a class property

  private devices: SengledDevice[] = []; // Remove the 'readonly' modifier

  constructor(log: Logger, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;

    this.username = config.username;
    this.password = config.password;

    this.api.on('didFinishLaunching', () => {
      this.login()
        .then(() => this.discoverDevices())
        .then(() => this.configureAccessories())
        .catch((error: any) => {
          this.log.error('Error during setup:', error as Error);
          // Using type assertion 'as Error' to treat 'error' as type 'Error'
        });
    });
  }

  // Perform the login operation
  private async login(): Promise<void> {
    try {
      const response: AxiosResponse = await axios.post('https://us-openapi.cloud.sengled.com/oauth2/login', {
        username: this.username,
        password: this.password,
      });
      this.accessToken = response.data.access_token; // Store the access token for subsequent API calls
      // You may want to persist this token securely for future use
    } catch (error) {
      throw new Error('Failed to log in to Sengled service: ' + (error as Error).message);
      // Using type assertion 'as Error' to treat 'error' as type 'Error'
    }
  }

  // Retrieve the list of devices from the Sengled service
  private async discoverDevices(): Promise<void> {
    try {
      if (!this.accessToken) {
        throw new Error('Access token is not available. Please ensure login was successful.');
      }

      // Make API request to fetch devices
      const response: AxiosResponse<SengledAPIResponse> = await axios.get('https://us-openapi.cloud.sengled.com/api/v1/devices', {
        headers: {
          Authorization: 'Bearer ' + this.accessToken,
        },
      });

      const apiResponse: SengledAPIResponse = response.data;
      this.devices = apiResponse.devices;
      // You can process and filter the devices as needed
    } catch (error) {
      throw new Error('Failed to fetch devices from Sengled service: ' + (error as Error).message);
      // Using type assertion 'as Error' to treat 'error' as type 'Error'
    }
  }

  // Configure the Homebridge accessories for each discovered device
  private configureAccessories(): void {
    for (const device of this.devices) {
      const accessory = new this.api.platformAccessory(device.name, this.api.hap.uuid.generate(device.id));

      // Add services and characteristics to the accessory as needed
      // You can refer to the Homebridge API documentation for more details

      this.api.registerPlatformAccessories('homebridge-sengled-platform', 'SengledPlatform', [accessory]);
    }
  }

  // Required method for the DynamicPlatformPlugin interface
  configureAccessory(accessory: PlatformAccessory): void {
    // This method is called for each accessory cached by Homebridge
    // You can choose to handle the cached accessory here if needed
    // For example, you might want to update the accessory's characteristics or services
    // based on the current state of the SengledDevice it represents
  }
}

export default (api: API) => {
  api.registerPlatform('homebridge-sengled-platform', 'SengledPlatform', SengledPlatform);
};
