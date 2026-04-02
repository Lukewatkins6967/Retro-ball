using System.Collections.Generic;
using System.Runtime.CompilerServices;
using UnityEngine.Scripting;

namespace UnityEngine.Experimental.Director
{
	[UsedByNativeCode]
	public struct AnimationMixerPlayable
	{
		internal AnimationPlayable handle;

		internal Playable node
		{
			get
			{
				return handle.node;
			}
		}

		public int inputCount
		{
			get
			{
				return Playables.GetInputCountValidated(this, GetType());
			}
		}

		public int outputCount
		{
			get
			{
				return Playables.GetOutputCountValidated(this, GetType());
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

		public static AnimationMixerPlayable Create()
		{
			AnimationMixerPlayable that = default(AnimationMixerPlayable);
			InternalCreate(ref that);
			return that;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern void InternalCreate(ref AnimationMixerPlayable that);

		public void Destroy()
		{
			node.Destroy();
		}

		public Playable GetInput(int inputPort)
		{
			return Playables.GetInputValidated(this, inputPort, GetType());
		}

		public Playable GetOutput(int outputPort)
		{
			return Playables.GetOutputValidated(this, outputPort, GetType());
		}

		public bool SetInputs(AnimationClip[] clips)
		{
			return AnimationPlayableUtilities.SetInputs(this, clips);
		}

		public float GetInputWeight(int index)
		{
			return Playables.GetInputWeightValidated(this, index, GetType());
		}

		public void SetInputWeight(int inputIndex, float weight)
		{
			Playables.SetInputWeightValidated(this, inputIndex, weight, GetType());
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

		public T CastTo<T>() where T : struct
		{
			return handle.CastTo<T>();
		}

		public int AddInput(Playable input)
		{
			return AnimationPlayableUtilities.AddInputValidated(this, input, GetType());
		}

		public bool SetInput(Playable source, int index)
		{
			return AnimationPlayableUtilities.SetInputValidated(this, source, index, GetType());
		}

		public bool SetInputs(IEnumerable<Playable> sources)
		{
			return AnimationPlayableUtilities.SetInputsValidated(this, sources, GetType());
		}

		public bool RemoveInput(int index)
		{
			return AnimationPlayableUtilities.RemoveInputValidated(this, index, GetType());
		}

		public bool RemoveAllInputs()
		{
			return AnimationPlayableUtilities.RemoveAllInputsValidated(this, GetType());
		}

		public static bool operator ==(AnimationMixerPlayable x, Playable y)
		{
			return Playables.Equals(x, y);
		}

		public static bool operator !=(AnimationMixerPlayable x, Playable y)
		{
			return !Playables.Equals(x, y);
		}

		public static implicit operator Playable(AnimationMixerPlayable b)
		{
			return b.node;
		}

		public static implicit operator AnimationPlayable(AnimationMixerPlayable b)
		{
			return b.handle;
		}
	}
}
