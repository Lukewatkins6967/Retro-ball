using System.Runtime.CompilerServices;
using UnityEngine.Scripting;

namespace UnityEngine
{
	public sealed class RectTransform : Transform
	{
		public enum Edge
		{
			Left = 0,
			Right = 1,
			Top = 2,
			Bottom = 3
		}

		public enum Axis
		{
			Horizontal = 0,
			Vertical = 1
		}

		public delegate void ReapplyDrivenProperties(RectTransform driven);

		public Rect rect
		{
			get
			{
				Rect value;
				INTERNAL_get_rect(out value);
				return value;
			}
		}

		public Vector2 anchorMin
		{
			get
			{
				Vector2 value;
				INTERNAL_get_anchorMin(out value);
				return value;
			}
			set
			{
				INTERNAL_set_anchorMin(ref value);
			}
		}

		public Vector2 anchorMax
		{
			get
			{
				Vector2 value;
				INTERNAL_get_anchorMax(out value);
				return value;
			}
			set
			{
				INTERNAL_set_anchorMax(ref value);
			}
		}

		public Vector3 anchoredPosition3D
		{
			get
			{
				Vector2 vector = anchoredPosition;
				return new Vector3(vector.x, vector.y, base.localPosition.z);
			}
			set
			{
				anchoredPosition = new Vector2(value.x, value.y);
				Vector3 vector = base.localPosition;
				vector.z = value.z;
				base.localPosition = vector;
			}
		}

		public Vector2 anchoredPosition
		{
			get
			{
				Vector2 value;
				INTERNAL_get_anchoredPosition(out value);
				return value;
			}
			set
			{
				INTERNAL_set_anchoredPosition(ref value);
			}
		}

		public Vector2 sizeDelta
		{
			get
			{
				Vector2 value;
				INTERNAL_get_sizeDelta(out value);
				return value;
			}
			set
			{
				INTERNAL_set_sizeDelta(ref value);
			}
		}

		public Vector2 pivot
		{
			get
			{
				Vector2 value;
				INTERNAL_get_pivot(out value);
				return value;
			}
			set
			{
				INTERNAL_set_pivot(ref value);
			}
		}

		internal extern Object drivenByObject
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		internal extern DrivenTransformProperties drivenProperties
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public Vector2 offsetMin
		{
			get
			{
				return anchoredPosition - Vector2.Scale(sizeDelta, pivot);
			}
			set
			{
				Vector2 vector = value - (anchoredPosition - Vector2.Scale(sizeDelta, pivot));
				sizeDelta -= vector;
				anchoredPosition += Vector2.Scale(vector, Vector2.one - pivot);
			}
		}

		public Vector2 offsetMax
		{
			get
			{
				return anchoredPosition + Vector2.Scale(sizeDelta, Vector2.one - pivot);
			}
			set
			{
				Vector2 vector = value - (anchoredPosition + Vector2.Scale(sizeDelta, Vector2.one - pivot));
				sizeDelta += vector;
				anchoredPosition += Vector2.Scale(vector, pivot);
			}
		}

		public static event ReapplyDrivenProperties reapplyDrivenProperties;

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_rect(out Rect value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_anchorMin(out Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_anchorMin(ref Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_anchorMax(out Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_anchorMax(ref Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_anchoredPosition(out Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_anchoredPosition(ref Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_sizeDelta(out Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_sizeDelta(ref Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_pivot(out Vector2 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_pivot(ref Vector2 value);

		[RequiredByNativeCode]
		internal static void SendReapplyDrivenProperties(RectTransform driven)
		{
			if (RectTransform.reapplyDrivenProperties != null)
			{
				RectTransform.reapplyDrivenProperties(driven);
			}
		}

		public void GetLocalCorners(Vector3[] fourCornersArray)
		{
			if (fourCornersArray == null || fourCornersArray.Length < 4)
			{
				Debug.LogError("Calling GetLocalCorners with an array that is null or has less than 4 elements.");
				return;
			}
			Rect rect = this.rect;
			float x = rect.x;
			float y = rect.y;
			float xMax = rect.xMax;
			float yMax = rect.yMax;
			fourCornersArray[0] = new Vector3(x, y, 0f);
			fourCornersArray[1] = new Vector3(x, yMax, 0f);
			fourCornersArray[2] = new Vector3(xMax, yMax, 0f);
			fourCornersArray[3] = new Vector3(xMax, y, 0f);
		}

		public void GetWorldCorners(Vector3[] fourCornersArray)
		{
			if (fourCornersArray == null || fourCornersArray.Length < 4)
			{
				Debug.LogError("Calling GetWorldCorners with an array that is null or has less than 4 elements.");
				return;
			}
			GetLocalCorners(fourCornersArray);
			Transform transform = base.transform;
			for (int i = 0; i < 4; i++)
			{
				fourCornersArray[i] = transform.TransformPoint(fourCornersArray[i]);
			}
		}

		internal Rect GetRectInParentSpace()
		{
			Rect result = rect;
			Vector2 vector = offsetMin + Vector2.Scale(pivot, result.size);
			Transform transform = base.transform.parent;
			if ((bool)transform)
			{
				RectTransform component = transform.GetComponent<RectTransform>();
				if ((bool)component)
				{
					vector += Vector2.Scale(anchorMin, component.rect.size);
				}
			}
			result.x += vector.x;
			result.y += vector.y;
			return result;
		}

		public void SetInsetAndSizeFromParentEdge(Edge edge, float inset, float size)
		{
			int index = ((edge == Edge.Top || edge == Edge.Bottom) ? 1 : 0);
			bool flag = edge == Edge.Top || edge == Edge.Right;
			float value = (flag ? 1 : 0);
			Vector2 vector = anchorMin;
			vector[index] = value;
			anchorMin = vector;
			vector = anchorMax;
			vector[index] = value;
			anchorMax = vector;
			Vector2 vector2 = sizeDelta;
			vector2[index] = size;
			sizeDelta = vector2;
			Vector2 vector3 = anchoredPosition;
			vector3[index] = ((!flag) ? (inset + size * pivot[index]) : (0f - inset - size * (1f - pivot[index])));
			anchoredPosition = vector3;
		}

		public void SetSizeWithCurrentAnchors(Axis axis, float size)
		{
			Vector2 vector = sizeDelta;
			vector[(int)axis] = size - GetParentSize()[(int)axis] * (anchorMax[(int)axis] - anchorMin[(int)axis]);
			sizeDelta = vector;
		}

		private Vector2 GetParentSize()
		{
			RectTransform rectTransform = base.parent as RectTransform;
			if (!rectTransform)
			{
				return Vector2.zero;
			}
			return rectTransform.rect.size;
		}
	}
}
