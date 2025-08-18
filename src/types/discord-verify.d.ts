declare module "discord-verify" {
  export const isValidRequest: (
    request: Request,
    publicKey: string,
    algorithm?: any,
  ) => Promise<boolean>;
  export const PlatformAlgorithm: Record<string, any>;
}
