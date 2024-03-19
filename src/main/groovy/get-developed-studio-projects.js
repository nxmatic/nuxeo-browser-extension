export default function getDevelopedStudioProjects(login, token) {
  return `
    import groovy.json.JsonOutput
    import org.nuxeo.connect.packages.PackageManager
    import org.nuxeo.connect.registration.RegistrationHelper
    import org.nuxeo.connect.update.PackageType
    import org.nuxeo.connect.update.Package
    import org.nuxeo.runtime.api.Framework
    import org.nuxeo.connect.data.ConnectProject

    PackageManager pm = Framework.getService(PackageManager.class);
    List<String> addons = pm.listInstalledPackagesNames(PackageType.STUDIO);

    RegistrationHelper rh = new RegistrationHelper();
    List<ConnectProject> projects = rh.getAvailableProjectsForRegistration('${login}', '${token}');

    List<String> projectNames = projects.collect { it.symbolicName };

    List<String> common = addons.intersect(projectNames);

    println JsonOutput.toJson( common );
  `;
}
