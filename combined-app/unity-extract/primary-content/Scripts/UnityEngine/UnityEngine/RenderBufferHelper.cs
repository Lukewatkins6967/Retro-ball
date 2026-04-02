using System;
using System.Runtime.CompilerServices;

namespace UnityEngine
{
	internal struct RenderBufferHelper
	{
		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern int GetLoadAction(out RenderBuffer b);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern void SetLoadAction(out RenderBuffer b, int a);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern int GetStoreAction(out RenderBuffer b);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern void SetStoreAction(out RenderBuffer b, int a);

		internal static IntPtr GetNativeRenderBufferPtr(IntPtr rb)
		{
			IntPtr value;
			INTERNAL_CALL_GetNativeRenderBufferPtr(rb, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetNativeRenderBufferPtr(IntPtr rb, out IntPtr value);
	}
}
