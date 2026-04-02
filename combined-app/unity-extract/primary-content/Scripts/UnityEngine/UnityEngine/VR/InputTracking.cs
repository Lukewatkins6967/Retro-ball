using System.Runtime.CompilerServices;

namespace UnityEngine.VR
{
	public static class InputTracking
	{
		public static Vector3 GetLocalPosition(VRNode node)
		{
			Vector3 value;
			INTERNAL_CALL_GetLocalPosition(node, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetLocalPosition(VRNode node, out Vector3 value);

		public static Quaternion GetLocalRotation(VRNode node)
		{
			Quaternion value;
			INTERNAL_CALL_GetLocalRotation(node, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetLocalRotation(VRNode node, out Quaternion value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void Recenter();
	}
}
