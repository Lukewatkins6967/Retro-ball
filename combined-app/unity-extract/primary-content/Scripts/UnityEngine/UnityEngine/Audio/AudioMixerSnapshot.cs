using System.Runtime.CompilerServices;

namespace UnityEngine.Audio
{
	public class AudioMixerSnapshot : Object
	{
		public extern AudioMixer audioMixer
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		internal AudioMixerSnapshot()
		{
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void TransitionTo(float timeToReach);
	}
}
