using System.Runtime.CompilerServices;

namespace UnityEngine.Diagnostics
{
	public static class PlayerConnection
	{
		public static extern bool connected
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void SendFile(string remoteFilePath, byte[] data);
	}
}
