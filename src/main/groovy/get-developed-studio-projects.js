export default function getDevelopedStudioProjects(login, token) {
  return `
    import groovy.json.JsonOutput
    import org.nuxeo.connect.client.we.StudioSnapshotHelper
    import org.nuxeo.connect.packages.PackageManager
    import org.nuxeo.connect.registration.RegistrationHelper
    import org.nuxeo.connect.update.PackageType
    import org.nuxeo.connect.update.Package
    import org.nuxeo.runtime.api.Framework
    import org.nuxeo.connect.data.ConnectProject

    PackageManager packages = Framework.getService(PackageManager.class);
    RegistrationHelper registrations = new RegistrationHelper();

    List<String> installedPackages = packages.listInstalledPackagesNames(PackageType.STUDIO);
    Package registeredPackage = StudioSnapshotHelper.getSnapshot(packages.listRemoteAssociatedStudioPackages())
    List<ConnectProject> projects = registrations.getAvailableProjectsForRegistration('${login}', '${token}');

    List<String> projectNames = projects.collect { it.symbolicName };
    projectNames.retainAll(installedPackages);

    List<Map> output = projectNames.collect { projectName ->
      [
        projectName: projectName,
        isRegistered: (registeredPackage != null && projectName == registeredPackage.name) || false
      ]
    };

    println JsonOutput.toJson(output);
  `;
}
