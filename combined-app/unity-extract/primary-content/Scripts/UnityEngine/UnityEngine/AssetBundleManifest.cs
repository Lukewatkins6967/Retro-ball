using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public sealed class AssetBundleManifest : Object
	{
		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string[] GetAllAssetBundles();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string[] GetAllAssetBundlesWithVariant();

		public Hash128 GetAssetBundleHash(string assetBundleName)
		{
			Hash128 value;
			INTERNAL_CALL_GetAssetBundleHash(this, assetBundleName, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetAssetBundleHash(AssetBundleManifest self, string assetBundleName, out Hash128 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string[] GetDirectDependencies(string assetBundleName);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string[] GetAllDependencies(string assetBundleName);
	}
}
