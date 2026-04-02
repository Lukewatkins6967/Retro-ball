using System;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace UnityEngine.Networking
{
	[StructLayout(LayoutKind.Sequential)]
	public class UploadHandler : IDisposable
	{
		[NonSerialized]
		internal IntPtr m_Ptr;

		public byte[] data
		{
			get
			{
				return GetData();
			}
		}

		public string contentType
		{
			get
			{
				return GetContentType();
			}
			set
			{
				SetContentType(value);
			}
		}

		public float progress
		{
			get
			{
				return GetProgress();
			}
		}

		internal UploadHandler()
		{
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalCreateRaw(byte[] data);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		[ThreadAndSerializationSafe]
		private extern void InternalDestroy();

		~UploadHandler()
		{
			InternalDestroy();
		}

		public void Dispose()
		{
			InternalDestroy();
			GC.SuppressFinalize(this);
		}

		internal virtual byte[] GetData()
		{
			return null;
		}

		internal virtual string GetContentType()
		{
			return "text/plain";
		}

		internal virtual void SetContentType(string newContentType)
		{
		}

		internal virtual float GetProgress()
		{
			return 0.5f;
		}
	}
}
