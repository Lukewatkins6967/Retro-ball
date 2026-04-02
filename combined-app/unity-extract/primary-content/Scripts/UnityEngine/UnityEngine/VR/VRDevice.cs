using System;
using System.Runtime.CompilerServices;

namespace UnityEngine.VR
{
	public static class VRDevice
	{
		public static extern bool isPresent
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		[Obsolete("family is deprecated.  Use VRSettings.loadedDeviceName instead.")]
		public static extern string family
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public static extern string model
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public static extern float refreshRate
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public static IntPtr GetNativePtr()
		{
			IntPtr value;
			INTERNAL_CALL_GetNativePtr(out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetNativePtr(out IntPtr value);
	}
}
