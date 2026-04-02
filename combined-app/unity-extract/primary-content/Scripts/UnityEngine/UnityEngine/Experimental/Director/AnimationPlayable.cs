using System;
using System.Collections.Generic;
using UnityEngine.Scripting;

namespace UnityEngine.Experimental.Director
{
	[UsedByNativeCode]
	public struct AnimationPlayable
	{
		internal Playable handle;

		internal Playable node
		{
			get
			{
				return handle;
			}
		}

		public static AnimationPlayable Null
		{
			get
			{
				return new AnimationPlayable
				{
					handle = 
					{
						m_Version = 10
					}
				};
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

		public void Destroy()
		{
			node.Destroy();
		}

		public int AddInput(Playable input)
		{
			if (!Playable.Connect(input, this, -1, -1))
			{
				throw new InvalidOperationException("AddInput Failed. Either the connected playable is incompatible or this AnimationPlayable type doesn't support adding inputs");
			}
			return inputCount - 1;
		}

		public bool SetInput(Playable source, int index)
		{
			if (!node.CheckInputBounds(index))
			{
				return false;
			}
			if (GetInput(index).IsValid())
			{
				Playable.Disconnect(this, index);
			}
			return Playable.Connect(source, this, -1, index);
		}

		public bool SetInputs(IEnumerable<Playable> sources)
		{
			for (int i = 0; i < inputCount; i++)
			{
				Playable.Disconnect(this, i);
			}
			bool flag = false;
			int num = 0;
			foreach (Playable source in sources)
			{
				flag = ((num >= inputCount) ? (flag | Playable.Connect(source, this, -1, -1)) : (flag | Playable.Connect(source, this, -1, num)));
				node.SetInputWeight(num, 1f);
				num++;
			}
			for (int j = num; j < inputCount; j++)
			{
				node.SetInputWeight(j, 0f);
			}
			return flag;
		}

		public bool RemoveInput(int index)
		{
			if (!Playables.CheckInputBounds(this, index))
			{
				return false;
			}
			Playable.Disconnect(this, index);
			return true;
		}

		public bool RemoveInput(Playable playable)
		{
			for (int i = 0; i < inputCount; i++)
			{
				if (GetInput(i) == playable)
				{
					Playable.Disconnect(this, i);
					return true;
				}
			}
			return false;
		}

		public bool RemoveAllInputs()
		{
			int num = node.inputCount;
			for (int i = 0; i < num; i++)
			{
				RemoveInput(i);
			}
			return true;
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

		public static bool operator ==(AnimationPlayable x, Playable y)
		{
			return Playables.Equals(x, y);
		}

		public static bool operator !=(AnimationPlayable x, Playable y)
		{
			return !Playables.Equals(x, y);
		}

		public static implicit operator Playable(AnimationPlayable b)
		{
			return b.node;
		}
	}
}
