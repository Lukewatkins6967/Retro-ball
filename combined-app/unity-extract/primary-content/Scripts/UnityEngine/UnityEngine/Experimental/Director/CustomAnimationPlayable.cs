using System;
using System.Collections.Generic;
using UnityEngine.Scripting;

namespace UnityEngine.Experimental.Director
{
	[RequiredByNativeCode]
	public class CustomAnimationPlayable : ScriptPlayable
	{
		internal AnimationPlayable handle;

		internal Playable node
		{
			get
			{
				return handle;
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

		public CustomAnimationPlayable()
		{
			if (!handle.IsValid())
			{
				string text = GetType().ToString();
				throw new InvalidOperationException(text + " must be instantiated using the Playable.Create<" + text + "> method instead of new " + text + ".");
			}
		}

		internal void SetHandle(int version, IntPtr playableHandle)
		{
			handle.handle.m_Handle = playableHandle;
			handle.handle.m_Version = version;
		}

		public void Destroy()
		{
			node.Destroy();
		}

		public virtual void PrepareFrame(FrameData info)
		{
		}

		public virtual void OnSetTime(float localTime)
		{
		}

		public virtual void OnSetPlayState(PlayState newState)
		{
		}

		public T CastTo<T>() where T : struct
		{
			return handle.CastTo<T>();
		}

		public Playable GetInput(int inputPort)
		{
			return Playables.GetInputValidated(this, inputPort, GetType());
		}

		public Playable GetOutput(int outputPort)
		{
			return Playables.GetOutputValidated(this, outputPort, GetType());
		}

		public float GetInputWeight(int index)
		{
			return Playables.GetInputWeightValidated(this, index, GetType());
		}

		public void SetInputWeight(int inputIndex, float weight)
		{
			Playables.SetInputWeightValidated(this, inputIndex, weight, GetType());
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

		public static implicit operator Playable(CustomAnimationPlayable s)
		{
			return new Playable
			{
				m_Handle = s.node.m_Handle,
				m_Version = s.node.m_Version
			};
		}

		public static implicit operator AnimationPlayable(CustomAnimationPlayable s)
		{
			return s.handle;
		}
	}
}
