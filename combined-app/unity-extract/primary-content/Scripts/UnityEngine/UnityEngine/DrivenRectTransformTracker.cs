using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public struct DrivenRectTransformTracker
	{
		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern bool CanRecordModifications();

		public void Add(Object driver, RectTransform rectTransform, DrivenTransformProperties drivenProperties)
		{
		}

		public void Clear()
		{
		}
	}
}
