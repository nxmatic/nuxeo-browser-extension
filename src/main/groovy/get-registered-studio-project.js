export default function getRegistedStudioProjects() {
  return `
    import groovy.json.JsonOutput
    import org.nuxeo.connect.client.we.StudioSnapshotHelper
    import org.nuxeo.connect.packages.PackageManager
    import org.nuxeo.connect.packages.dependencies.TargetPlatformFilterHelper
    import org.nuxeo.connect.platform.PlatformId
    import org.nuxeo.connect.update.Package
    import org.nuxeo.connect.update.PackageDependency
    import org.nuxeo.ecm.admin.runtime.PlatformVersionHelper
    import org.nuxeo.runtime.api.Framework

    PackageManager pm = Framework.getService(PackageManager)
    Package snapshotPkg = StudioSnapshotHelper.getSnapshot(pm.listRemoteAssociatedStudioPackages())
    PlatformId nxInstance = PlatformVersionHelper.platformId

    String pkgName = snapshotPkg == null ? null : snapshotPkg.name
    String[] targetPlatform = snapshotPkg == null ? null : snapshotPkg.targetPlatforms
    boolean match = true
    if (!TargetPlatformFilterHelper.isCompatibleWithTargetPlatform(snapshotPkg, nxInstance)) {
        match = false
    }
    PackageDependency[] dependencies = snapshotPkg == null ? null : snapshotPkg.dependencies

    println JsonOutput
      .toJson([studio: pkgName, nx: nxInstance, studioDistrib: targetPlatform, match: match, deps: dependencies])
  `;
}
