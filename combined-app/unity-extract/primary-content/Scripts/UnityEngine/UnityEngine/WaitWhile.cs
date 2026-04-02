using System;

namespace UnityEngine
{
	public sealed class WaitWhile : CustomYieldInstruction
	{
		private Func<bool> m_Predicate;

		public override bool keepWaiting
		{
			get
			{
				return m_Predicate();
			}
		}

		public WaitWhile(Func<bool> predicate)
		{
			m_Predicate = predicate;
		}
	}
}
