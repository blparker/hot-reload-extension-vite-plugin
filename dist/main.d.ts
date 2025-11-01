import { Plugin } from 'vite';

type HotReloadOptions = {
    log?: boolean;
    backgroundPath?: string;
    sidepanelPath?: string;
};
declare function hotReloadExtension(options: HotReloadOptions): Plugin;

export { hotReloadExtension as default };
