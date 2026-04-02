using System;
using UnityEngine.Scripting;

namespace UnityEngine
{
	[RequiredByNativeCode]
	public struct AnimatorStateInfo
	{
		private int m_Name;

		private int m_Path;

		private int m_FullPath;

		private float m_NormalizedTime;

		private float m_Length;

		private float m_Speed;

		private float m_SpeedMultiplier;

		private int m_Tag;

		private int m_Loop;

		public int fullPathHash
		{
			get
			{
				return m_FullPath;
			}
		}

		[Obsolete("Use AnimatorStateInfo.fullPathHash instead.")]
		public int nameHash
		{
			get
			{
				return m_Path;
			}
		}

		public int shortNameHash
		{
			get
			{
				return m_Name;
			}
		}

		public float normalizedTime
		{
			get
			{
				return m_NormalizedTime;
			}
		}

		public float length
		{
			get
			{
				return m_Length;
			}
		}

		public float speed
		{
			get
			{
				return m_Speed;
			}
		}

		public float speedMultiplier
		{
			get
			{
				return m_SpeedMultiplier;
			}
		}

		public int tagHash
		{
			get
			{
				return m_Tag;
			}
		}

		public bool loop
		{
			get
			{
				return m_Loop != 0;
			}
		}

		public bool IsName(string name)
		{
			int num = Animator.StringToHash(name);
			return num == m_FullPath || num == m_Name || num == m_Path;
		}

		public bool IsTag(string tag)
		{
			return Animator.StringToHash(tag) == m_Tag;
		}
	}
}
