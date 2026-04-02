using System;
using System.Collections.Generic;
using UnityEngine.EventSystems;
using UnityEngine.Serialization;

namespace UnityEngine.UI
{
	[RequireComponent(typeof(Canvas))]
	[AddComponentMenu("Event/Graphic Raycaster")]
	public class GraphicRaycaster : BaseRaycaster
	{
		public enum BlockingObjects
		{
			None = 0,
			TwoD = 1,
			ThreeD = 2,
			All = 3
		}

		protected const int kNoEventMaskSet = -1;

		[FormerlySerializedAs("ignoreReversedGraphics")]
		[SerializeField]
		private bool m_IgnoreReversedGraphics = true;

		[SerializeField]
		[FormerlySerializedAs("blockingObjects")]
		private BlockingObjects m_BlockingObjects;

		[SerializeField]
		protected LayerMask m_BlockingMask = -1;

		private Canvas m_Canvas;

		[NonSerialized]
		private List<Graphic> m_RaycastResults = new List<Graphic>();

		[NonSerialized]
		private static readonly List<Graphic> s_SortedGraphics = new List<Graphic>();

		public override int sortOrderPriority
		{
			get
			{
				if (canvas.renderMode == RenderMode.ScreenSpaceOverlay)
				{
					return canvas.sortingOrder;
				}
				return base.sortOrderPriority;
			}
		}

		public override int renderOrderPriority
		{
			get
			{
				if (canvas.renderMode == RenderMode.ScreenSpaceOverlay)
				{
					return canvas.renderOrder;
				}
				return base.renderOrderPriority;
			}
		}

		public bool ignoreReversedGraphics
		{
			get
			{
				return m_IgnoreReversedGraphics;
			}
			set
			{
				m_IgnoreReversedGraphics = value;
			}
		}

		public BlockingObjects blockingObjects
		{
			get
			{
				return m_BlockingObjects;
			}
			set
			{
				m_BlockingObjects = value;
			}
		}

		private Canvas canvas
		{
			get
			{
				if (m_Canvas != null)
				{
					return m_Canvas;
				}
				m_Canvas = GetComponent<Canvas>();
				return m_Canvas;
			}
		}

		public override Camera eventCamera
		{
			get
			{
				if (canvas.renderMode == RenderMode.ScreenSpaceOverlay || (canvas.renderMode == RenderMode.ScreenSpaceCamera && canvas.worldCamera == null))
				{
					return null;
				}
				return (!(canvas.worldCamera != null)) ? Camera.main : canvas.worldCamera;
			}
		}

		protected GraphicRaycaster()
		{
		}

		public override void Raycast(PointerEventData eventData, List<RaycastResult> resultAppendList)
		{
			if (canvas == null)
			{
				return;
			}
			Vector3 vector = Display.RelativeMouseAt(eventData.position);
			int targetDisplay = canvas.targetDisplay;
			if (vector.z != (float)targetDisplay)
			{
				return;
			}
			if (vector.z == 0f)
			{
				vector = eventData.position;
			}
			Vector2 vector2;
			if (eventCamera == null)
			{
				float num = Screen.width;
				float num2 = Screen.height;
				if (targetDisplay > 0 && targetDisplay < Display.displays.Length)
				{
					num = Display.displays[targetDisplay].systemWidth;
					num2 = Display.displays[targetDisplay].systemHeight;
				}
				vector2 = new Vector2(vector.x / num, vector.y / num2);
			}
			else
			{
				vector2 = eventCamera.ScreenToViewportPoint(vector);
			}
			if (vector2.x < 0f || vector2.x > 1f || vector2.y < 0f || vector2.y > 1f)
			{
				return;
			}
			float num3 = float.MaxValue;
			Ray ray = default(Ray);
			if (eventCamera != null)
			{
				ray = eventCamera.ScreenPointToRay(vector);
			}
			if (canvas.renderMode != RenderMode.ScreenSpaceOverlay && blockingObjects != BlockingObjects.None)
			{
				float num4 = 100f;
				if (eventCamera != null)
				{
					num4 = eventCamera.farClipPlane - eventCamera.nearClipPlane;
				}
				RaycastHit hitInfo;
				if ((blockingObjects == BlockingObjects.ThreeD || blockingObjects == BlockingObjects.All) && Physics.Raycast(ray, out hitInfo, num4, m_BlockingMask))
				{
					num3 = hitInfo.distance;
				}
				if (blockingObjects == BlockingObjects.TwoD || blockingObjects == BlockingObjects.All)
				{
					RaycastHit2D raycastHit2D = Physics2D.Raycast(ray.origin, ray.direction, num4, m_BlockingMask);
					if (raycastHit2D.collider != null)
					{
						num3 = raycastHit2D.fraction * num4;
					}
				}
			}
			m_RaycastResults.Clear();
			Raycast(canvas, eventCamera, vector, m_RaycastResults);
			for (int i = 0; i < m_RaycastResults.Count; i++)
			{
				GameObject gameObject = m_RaycastResults[i].gameObject;
				bool flag = true;
				if (ignoreReversedGraphics)
				{
					if (eventCamera == null)
					{
						Vector3 rhs = gameObject.transform.rotation * Vector3.forward;
						flag = Vector3.Dot(Vector3.forward, rhs) > 0f;
					}
					else
					{
						Vector3 lhs = eventCamera.transform.rotation * Vector3.forward;
						Vector3 rhs2 = gameObject.transform.rotation * Vector3.forward;
						flag = Vector3.Dot(lhs, rhs2) > 0f;
					}
				}
				if (!flag)
				{
					continue;
				}
				float num5 = 0f;
				if (eventCamera == null || canvas.renderMode == RenderMode.ScreenSpaceOverlay)
				{
					num5 = 0f;
				}
				else
				{
					Transform transform = gameObject.transform;
					Vector3 forward = transform.forward;
					num5 = Vector3.Dot(forward, transform.position - ray.origin) / Vector3.Dot(forward, ray.direction);
					if (num5 < 0f)
					{
						continue;
					}
				}
				if (!(num5 >= num3))
				{
					RaycastResult item = new RaycastResult
					{
						gameObject = gameObject,
						module = this,
						distance = num5,
						screenPosition = vector,
						index = resultAppendList.Count,
						depth = m_RaycastResults[i].depth,
						sortingLayer = canvas.sortingLayerID,
						sortingOrder = canvas.sortingOrder
					};
					resultAppendList.Add(item);
				}
			}
		}

		private static void Raycast(Canvas canvas, Camera eventCamera, Vector2 pointerPosition, List<Graphic> results)
		{
			IList<Graphic> graphicsForCanvas = GraphicRegistry.GetGraphicsForCanvas(canvas);
			for (int i = 0; i < graphicsForCanvas.Count; i++)
			{
				Graphic graphic = graphicsForCanvas[i];
				if (graphic.depth != -1 && graphic.raycastTarget && RectTransformUtility.RectangleContainsScreenPoint(graphic.rectTransform, pointerPosition, eventCamera) && graphic.Raycast(pointerPosition, eventCamera))
				{
					s_SortedGraphics.Add(graphic);
				}
			}
			s_SortedGraphics.Sort((Graphic g1, Graphic g2) => g2.depth.CompareTo(g1.depth));
			for (int num = 0; num < s_SortedGraphics.Count; num++)
			{
				results.Add(s_SortedGraphics[num]);
			}
			s_SortedGraphics.Clear();
		}
	}
}
