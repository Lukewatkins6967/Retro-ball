using System.Runtime.CompilerServices;
using UnityEngine.Scripting;

namespace UnityEngine.Experimental.Director
{
	[RequiredByNativeCode]
	public struct GenericMixerPlayable
	{
		internal Playable handle;

		internal Playable node
		{
			get
			{
				return handle;
			}
		}

		public static GenericMixerPlayable Create()
		{
			GenericMixerPlayable playable = default(GenericMixerPlayable);
			InternalCreate(ref playable);
			return playable;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern void InternalCreate(ref GenericMixerPlayable playable);

		public void Destroy()
		{
			handle.Destroy();
		}

		public T CastTo<T>() where T : struct
		{
			return handle.CastTo<T>();
		}

		public static implicit operator Playable(GenericMixerPlayable s)
		{
			return new Playable
			{
				m_Handle = s.handle.m_Handle,
				m_Version = s.handle.m_Version
			};
		}
	}
}
