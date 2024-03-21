export default function registerDevelopedStudioProject(login, token, projectName) {
  return `
    import groovy.json.JsonOutput
    import org.nuxeo.connect.identity.LogicalInstanceIdentifier
    import org.nuxeo.connect.registration.RegistrationException
    import org.nuxeo.connect.registration.RegistrationHelper
    import org.nuxeo.runtime.api.Framework
  
    LogicalInstanceIdentifier clid = Framework.getService(RegistrationHelper.class)
            .registerInstance(${login}, ${token}, ${projectName}, "nuxeo web extension registration", "dev", "development", ${token}, true, false, false);
    Framework.getService(RegistrationHelper.class).storeInstanceIdentifier(clid);

    println JsonOutput
      .toJson(clid)
  `;
}
