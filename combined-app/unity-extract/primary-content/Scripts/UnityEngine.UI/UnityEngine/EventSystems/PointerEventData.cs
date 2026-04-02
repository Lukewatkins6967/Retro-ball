using System;
using System.Collections.Generic;
using System.Text;

namespace UnityEngine.EventSystems
{
	public class PointerEventData : BaseEventData
	{
		public enum InputButton
		{
			Left = 0,
			Right = 1,
			Middle = 2
		}

		public enum FramePressState
		{
			Pressed = 0,
			Released = 1,
			PressedAndReleased = 2,
			NotChanged = 3
		}

		private GameObject m_PointerPress;

		public List<GameObject> hovered = new List<GameObject>();

		public GameObject pointerEnter { get; set; }

		public GameObject lastPress { get; private set; }

		public GameObject rawPointerPress { get; set; }

		public GameObject pointerDrag { get; set; }

		public RaycastResult pointerCurrentRaycast { get; set; }

		public RaycastResult pointerPressRaycast { get; set; }

		public bool eligibleForClick { get; set; }

		public int pointerId { get; set; }

		public Vector2 position { get; set; }

		public Vector2 delta { get; set; }

		public Vector2 pressPosition { get; set; }

		[Obsolete("Use either pointerCurrentRaycast.worldPosition or pointerPressRaycast.worldPosition")]
		public Vector3 worldPosition { get; set; }

		[Obsolete("Use either pointerCurrentRaycast.worldNormal or pointerPressRaycast.worldNormal")]
		public Vector3 worldNormal { get; set; }

		public float clickTime { get; set; }

		public int clickCount { get; set; }

		public Vector2 scrollDelta { get; set; }

		public bool useDragThreshold { get; set; }

		public bool dragging { get; set; }

		public InputButton button { get; set; }

		public Camera enterEventCamera
		{
			get
			{
				return (!(pointerCurrentRaycast.module == null)) ? pointerCurrentRaycast.module.eventCamera : null;
			}
		}

		public Camera pressEventCamera
		{
			get
			{
				return (!(pointerPressRaycast.module == null)) ? pointerPressRaycast.module.eventCamera : null;
			}
		}

		public GameObject pointerPress
		{
			get
			{
				return m_PointerPress;
			}
			set
			{
				if (!(m_PointerPress == value))
				{
					lastPress = m_PointerPress;
					m_PointerPress = value;
				}
			}
		}

		public PointerEventData(EventSystem eventSystem)
			: base(eventSystem)
		{
			eligibleForClick = false;
			pointerId = -1;
			position = Vector2.zero;
			delta = Vector2.zero;
			pressPosition = Vector2.zero;
			clickTime = 0f;
			clickCount = 0;
			scrollDelta = Vector2.zero;
			useDragThreshold = true;
			dragging = false;
			button = InputButton.Left;
		}

		public bool IsPointerMoving()
		{
			return delta.sqrMagnitude > 0f;
		}

		public bool IsScrolling()
		{
			return scrollDelta.sqrMagnitude > 0f;
		}

		public override string ToString()
		{
			StringBuilder stringBuilder = new StringBuilder();
			stringBuilder.AppendLine("<b>Position</b>: " + position);
			stringBuilder.AppendLine("<b>delta</b>: " + delta);
			stringBuilder.AppendLine("<b>eligibleForClick</b>: " + eligibleForClick);
			stringBuilder.AppendLine("<b>pointerEnter</b>: " + pointerEnter);
			stringBuilder.AppendLine("<b>pointerPress</b>: " + pointerPress);
			stringBuilder.AppendLine("<b>lastPointerPress</b>: " + lastPress);
			stringBuilder.AppendLine("<b>pointerDrag</b>: " + pointerDrag);
			stringBuilder.AppendLine("<b>Use Drag Threshold</b>: " + useDragThreshold);
			stringBuilder.AppendLine("<b>Current Rayast:</b>");
			stringBuilder.AppendLine(pointerCurrentRaycast.ToString());
			stringBuilder.AppendLine("<b>Press Rayast:</b>");
			stringBuilder.AppendLine(pointerPressRaycast.ToString());
			return stringBuilder.ToString();
		}
	}
}
