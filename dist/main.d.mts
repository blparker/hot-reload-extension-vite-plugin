import { Plugin } from 'vite';

type hotReloadExtensionOptions = {
    backgroundPath: string;
    sidepanelPath?: string;
    log?: boolean;
};
declare const hotReloadExtension: (options: hotReloadExtensionOptions) => Plugin;

export { hotReloadExtension as default, type hotReloadExtensionOptions };
