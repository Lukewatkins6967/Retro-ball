using System.Runtime.CompilerServices;

namespace UnityEngine.Audio
{
	public class AudioMixerGroup : Object
	{
		public extern AudioMixer audioMixer
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		internal AudioMixerGroup()
		{
		}
	}
}
