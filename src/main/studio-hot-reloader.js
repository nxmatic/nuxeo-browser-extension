/* eslint-disable comma-dangle */
/*
Copyright 2016-2024 Nuxeo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import NuxeoServerVersion from 'nuxeo/lib/server-version';

const checkDependencies = `import groovy.json.JsonOutput;
import org.nuxeo.connect.packages.PackageManager;
import org.nuxeo.connect.packages.dependencies.TargetPlatformFilterHelper;
import org.nuxeo.connect.client.we.StudioSnapshotHelper;
import org.nuxeo.ecm.admin.runtime.PlatformVersionHelper;
import org.nuxeo.ecm.admin.runtime.RuntimeInstrospection
import org.nuxeo.runtime.api.Framework;

def pm = Framework.getService(PackageManager.class);
def snapshotPkg = StudioSnapshotHelper.getSnapshot(pm.listRemoteAssociatedStudioPackages());
def nxInstance = PlatformVersionHelper.getPlatformFilter();

def pkgName = snapshotPkg == null ? null : snapshotPkg.getName();
def targetPlatform = snapshotPkg == null ? null : snapshotPkg.getTargetPlatforms();
def match = true;
if (!TargetPlatformFilterHelper.isCompatibleWithTargetPlatform(snapshotPkg, nxInstance)) {
  match = false;
}
def dependencies = snapshotPkg == null ? null : snapshotPkg.getDependencies();

println JsonOutput.toJson([studio: pkgName, nx: nxInstance, studioDistrib: targetPlatform, match: match, deps: dependencies]);`;

class StudioHotReloader {
  constructor(worker) {
    this.worker = worker;

    // Bind methods
    this.reload = this.reload.bind(this);
  }

  dependenciesMismatch(info = []) {
    return this.worker.browserStore
      .get({ studioDependenciesMismatch: info })
      .then((store) => store.studioDependenciesMismatch);
  }

  reset() {
    return this.browserStore.set({ studioDependenciesMismatch: [] });
  }

  reload(validate = true) {
    return this.worker.serverConnector.withNuxeo()
      .then((nuxeo) => nuxeo
        .operation('Service.HotReloadStudioSnapshot')
        .params({
          validate,
        })
        .execute()
        .then((response) => ({ response: response[0], notification: null }))
        .then(({ response, notification }) => {
          if (response.status !== 'success') return { response, notification };
          return {
            response,
            notification: {
              title: 'Success!',
              message: response.message,
              iconUrl: '../images/nuxeo-128.png',
            }
          };
        })
        .then(({ response, notification }) => {
          if (response.status !== 204) return { response, notification };
          return {
            response,
            notification: {
              title: 'Success!',
              message: 'A Hot Reload has successfully been completed.',
              iconUrl: '../images/nuxeo-128.png',
            }
          };
        })
        .then(({ response, notification }) => {
          if (response.status !== 'error') return { response, notification };
          return {
            response,
            notification: {
              title: 'Error',
              message: response.message,
              iconUrl: '../images/access_denied.png',
            }
          };
        })
        .then(({ response, notification }) => {
          if (response.status !== 'updateInProgress') return { response, notification };
          return {
            response,
            notification: {
              title: 'Error',
              message: response.message,
              iconUrl: '../images/access_denied.png',
            }
          };
        })
        .then(({ response, notification }) => {
          if (response.status !== 'DEPENDENCY_MISMATCH') return { response, notification, dependenciesMismatch: [] };
          return {
            response,
            notification: {
              title: 'Dependency Mismatch',
              message: response.message,
              iconUrl: '../images/access_denied.png',
            },
            dependenciesMismatch: response.deps
          };
        })
        .then(({ response, notification, dependenciesMismatch }) => this.worker.browserStore
          .set({ studioDependenciesMismatch: dependenciesMismatch })
          .then((store) => this.worker.desktopNotifier
            .notify('hot_reload', notification)
            .then(() => ({ response, dependenciesMismatch: store.studioDependenciesMismatch }))))
        .catch((error) => this.handleLegacyError(error)));
  }

  handleLegacyError(error) {
    const nuxeoServerVersion = NuxeoServerVersion.create(this.worker.serverConnector.runtimeInfo().nuxeo.version);
    const nuxeoLegacyVersion = NuxeoServerVersion.create('9.2');
    if (!nuxeoServerVersion.lte(nuxeoLegacyVersion)) throw error;
    // Error handling for Nuxeo 9.2 and older
    this.worker.serverConnector
      .executeScript(checkDependencies)
      .then((text) => {
        const checkDeps = JSON.parse(text).match;
        let message = '';
        let dependencyError = {};
        if (JSON.parse(text).nx !== JSON.parse(text).studioDistrib[0]) {
          message += `${JSON.parse(text).studio} - ${
            JSON.parse(text).studioDistrib[0]
          } cannot be installed on Nuxeo ${JSON.parse(text).nx}.`;
          dependencyError = {
            id: 'dependenciesMismatch',
            title: 'Dependency Mismatch',
            message,
            imageUrl: '../images/access_denied.png',
            interaction: true,
          };
        } else {
          dependencyError = this.worker.serverConnector.defaultServerError;
        }
        if (!checkDeps) {
          this.handleErrors(error, dependencyError);
          const deps = JSON.parse(text).deps;
          if (deps.length > 0) {
            const items = [];
            deps.forEach((dep) => {
              items.push({ title: '', message: dep.name });
            });
            this.worker.desktopNotifier
              .notify(
                'dependency_check',
                {
                  type: 'list',
                  title: 'Check Dependencies',
                  message: 'Please check that the following dependencies are installed:',
                  items,
                  iconUrl: '../images/access_denied.png',
                  requireInteraction: true,
                }
              ).catch((e) => console.error(e));
          }
        } else {
          this.nuxeo
            .operation('Service.HotReloadStudioSnapshot')
            .execute()
            .then(() => {
              this.worker.desktopNotifier.notify('success', {
                title: 'Success!',
                message: 'A Hot Reload has successfully been completed.',
                iconUrl: '../images/nuxeo-128.png',
              });
              this.worker.serverConnector.reloadTab();
            })
            .catch((er) => {
              this.handleErrors(er, this.worker.serverConnector.defasultServerError);
            });
        }
      }); // End of executeScript callback
  } // End of the reloadLegacy method
}

export default StudioHotReloader;
