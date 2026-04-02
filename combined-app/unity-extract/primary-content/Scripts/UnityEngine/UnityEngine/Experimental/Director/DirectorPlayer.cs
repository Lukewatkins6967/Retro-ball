using System.Runtime.CompilerServices;

namespace UnityEngine.Experimental.Director
{
	public class DirectorPlayer : Behaviour
	{
		public void Play(Playable pStruct)
		{
			PlayStructInternal(pStruct);
		}

		private void PlayStructInternal(Playable pStruct)
		{
			INTERNAL_CALL_PlayStructInternal(this, ref pStruct);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_PlayStructInternal(DirectorPlayer self, ref Playable pStruct);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void Stop();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetTime(double time);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern double GetTime();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetTimeUpdateMode(DirectorUpdateMode mode);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern DirectorUpdateMode GetTimeUpdateMode();
	}
}
