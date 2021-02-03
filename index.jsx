import { Icon, Tooltip } from '@vizality/components';
import { Plugin } from '@vizality/entities';
import { patch, unpatch } from '@vizality/patcher';
import { findInReactTree } from '@vizality/util/react';
import { getModule } from '@vizality/webpack';
import { debounce } from 'lodash';

const pluginChannels = [
   '753291447523868753',
   '700461738004578334'  
];

const githubRegex = /(http|https)\:\/\/github\.com\/(.+)\/(.*?)\.git/;


export default class PluginInstaller extends Plugin {
   start() {
      this.patchMiniPopover();
      this.injectStyles("style.scss");
   }

   showToast(text) {
      vizality.api.notices.sendToast(Math.random().toString(36).slice(2), {
         header: 'Plugin Installer:',
         content: text
      });
   }

   installPluginByMessage(message) {
      if (!message || !message.embeds.length || !message.embeds[0].fields?.length) return;
      const sourceField = message.embeds[0].fields.find(e => e && e.rawName == 'Source');
      if (!sourceField || !sourceField.rawValue) return;

      const url = sourceField.rawValue.startsWith('<') ? sourceField.rawValue.replace(/<|>/g, '') : sourceField.rawValue;
      const gitUrl = url.endsWith('.git') ? url : url + '.git';
      const pluginLabel = gitUrl.replace(githubRegex, '$3 by $2');
      const rawName = gitUrl.replace(githubRegex, "$3");
      if (vizality.manager.plugins.isInstalled(rawName)) return this.showToast(`Plugin ${pluginLabel} is already installed!`);

      vizality.manager.plugins.install(gitUrl)
      .then(() => {
         this.showToast(`Plugin ${pluginLabel} was installed.`);
      })
      .catch(error => {
         this.showToast(`Plugin could not be installed! Console for more details.`);
         this.error(error);
      });
   }

   patchMiniPopover() {
      const MiniPopover = getModule(m => m?.default?.displayName == 'MiniPopover');

      patch('plugin-installer', MiniPopover, 'default', (args, res) => {
         const props = findInReactTree(args, m => m && m.message && m.channel);
         if (!props || pluginChannels.indexOf(props.channel.id) < 0) return res;
         res.props.children.unshift(
            <MiniPopover.Button>
               <Tooltip text="Install Plugin" position="top">
                  <Icon className="pluginInstaller-icon" name="Plugin" onClick={debounce(() => this.installPluginByMessage(props.message), 20)} />
               </Tooltip>
            </MiniPopover.Button>
         , <MiniPopover.Separator />);

         return res;
      });
   }

   stop() {
      unpatch('plugin-installer');
   }
}