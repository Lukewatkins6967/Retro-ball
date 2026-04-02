using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace UnityEngine.Networking
{
	[StructLayout(LayoutKind.Sequential)]
	public sealed class DownloadHandlerTexture : DownloadHandler
	{
		public Texture2D texture
		{
			get
			{
				return InternalGetTexture();
			}
		}

		public DownloadHandlerTexture()
		{
			InternalCreateTexture(true);
		}

		public DownloadHandlerTexture(bool readable)
		{
			InternalCreateTexture(readable);
		}

		protected override byte[] GetData()
		{
			return InternalGetData();
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern Texture2D InternalGetTexture();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern byte[] InternalGetData();

		public static Texture2D GetContent(UnityWebRequest www)
		{
			return DownloadHandler.GetCheckedDownloader<DownloadHandlerTexture>(www).texture;
		}
	}
}
