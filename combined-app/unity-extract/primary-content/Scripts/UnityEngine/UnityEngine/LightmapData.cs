using System.Runtime.InteropServices;

namespace UnityEngine
{
	[StructLayout(LayoutKind.Sequential)]
	public sealed class LightmapData
	{
		internal Texture2D m_Light;

		internal Texture2D m_Dir;

		public Texture2D lightmapFar
		{
			get
			{
				return m_Light;
			}
			set
			{
				m_Light = value;
			}
		}

		public Texture2D lightmapNear
		{
			get
			{
				return m_Dir;
			}
			set
			{
				m_Dir = value;
			}
		}
	}
}
