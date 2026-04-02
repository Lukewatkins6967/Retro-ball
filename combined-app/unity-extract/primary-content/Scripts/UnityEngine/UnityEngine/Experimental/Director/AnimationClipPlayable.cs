using System.Runtime.CompilerServices;
using UnityEngine.Scripting;

namespace UnityEngine.Experimental.Director
{
	[UsedByNativeCode]
	public struct AnimationClipPlayable
	{
		internal AnimationPlayable handle;

		internal Playable node
		{
			get
			{
				return handle.node;
			}
		}

		public PlayState state
		{
			get
			{
				return Playables.GetPlayStateValidated(this, GetType());
			}
			set
			{
				Playables.SetPlayStateValidated(this, value, GetType());
			}
		}

		public double time
		{
			get
			{
				return Playables.GetTimeValidated(this, GetType());
			}
			set
			{
				Playables.SetTimeValidated(this, value, GetType());
			}
		}

		public double duration
		{
			get
			{
				return Playables.GetDurationValidated(this, GetType());
			}
			set
			{
				Playables.SetDurationValidated(this, value, GetType());
			}
		}

		public int outputCount
		{
			get
			{
				return Playables.GetOutputCountValidated(this, GetType());
			}
		}

		public AnimationClip clip
		{
			get
			{
				return GetAnimationClip(ref this);
			}
		}

		public float speed
		{
			get
			{
				return GetSpeed(ref this);
			}
			set
			{
				SetSpeed(ref this, value);
			}
		}

		public bool applyFootIK
		{
			get
			{
				return GetApplyFootIK(ref this);
			}
			set
			{
				SetApplyFootIK(ref this, value);
			}
		}

		internal bool removeStartOffset
		{
			get
			{
				return GetRemoveStartOffset(ref this);
			}
			set
			{
				SetRemoveStartOffset(ref this, value);
			}
		}

		public static AnimationClipPlayable Create(AnimationClip clip)
		{
			AnimationClipPlayable that = default(AnimationClipPlayable);
			InternalCreate(clip, ref that);
			return that;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern void InternalCreate(AnimationClip clip, ref AnimationClipPlayable that);

		public void Destroy()
		{
			node.Destroy();
		}

		public override bool Equals(object p)
		{
			return Playables.Equals(this, p);
		}

		public override int GetHashCode()
		{
			return node.GetHashCode();
		}

		public bool IsValid()
		{
			return Playables.IsValid(this);
		}

		public Playable GetOutput(int outputPort)
		{
			return Playables.GetOutputValidated(this, outputPort, GetType());
		}

		public T CastTo<T>() where T : struct
		{
			return handle.CastTo<T>();
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern AnimationClip GetAnimationClip(ref AnimationClipPlayable that);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern float GetSpeed(ref AnimationClipPlayable that);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetSpeed(ref AnimationClipPlayable that, float value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool GetApplyFootIK(ref AnimationClipPlayable that);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetApplyFootIK(ref AnimationClipPlayable that, bool value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool GetRemoveStartOffset(ref AnimationClipPlayable that);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetRemoveStartOffset(ref AnimationClipPlayable that, bool value);

		public static bool operator ==(AnimationClipPlayable x, Playable y)
		{
			return Playables.Equals(x, y);
		}

		public static bool operator !=(AnimationClipPlayable x, Playable y)
		{
			return !Playables.Equals(x, y);
		}

		public static implicit operator Playable(AnimationClipPlayable b)
		{
			return b.node;
		}

		public static implicit operator AnimationPlayable(AnimationClipPlayable b)
		{
			return b.handle;
		}
	}
}
