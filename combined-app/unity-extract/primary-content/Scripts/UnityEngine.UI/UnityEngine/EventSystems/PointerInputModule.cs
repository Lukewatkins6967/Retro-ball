using System.Collections.Generic;
using System.Text;

namespace UnityEngine.EventSystems
{
	public abstract class PointerInputModule : BaseInputModule
	{
		protected class ButtonState
		{
			private PointerEventData.InputButton m_Button;

			private MouseButtonEventData m_EventData;

			public MouseButtonEventData eventData
			{
				get
				{
					return m_EventData;
				}
				set
				{
					m_EventData = value;
				}
			}

			public PointerEventData.InputButton button
			{
				get
				{
					return m_Button;
				}
				set
				{
					m_Button = value;
				}
			}
		}

		protected class MouseState
		{
			private List<ButtonState> m_TrackedButtons = new List<ButtonState>();

			public bool AnyPressesThisFrame()
			{
				for (int i = 0; i < m_TrackedButtons.Count; i++)
				{
					if (m_TrackedButtons[i].eventData.PressedThisFrame())
					{
						return true;
					}
				}
				return false;
			}

			public bool AnyReleasesThisFrame()
			{
				for (int i = 0; i < m_TrackedButtons.Count; i++)
				{
					if (m_TrackedButtons[i].eventData.ReleasedThisFrame())
					{
						return true;
					}
				}
				return false;
			}

			public ButtonState GetButtonState(PointerEventData.InputButton button)
			{
				ButtonState buttonState = null;
				for (int i = 0; i < m_TrackedButtons.Count; i++)
				{
					if (m_TrackedButtons[i].button == button)
					{
						buttonState = m_TrackedButtons[i];
						break;
					}
				}
				if (buttonState == null)
				{
					ButtonState buttonState2 = new ButtonState();
					buttonState2.button = button;
					buttonState2.eventData = new MouseButtonEventData();
					buttonState = buttonState2;
					m_TrackedButtons.Add(buttonState);
				}
				return buttonState;
			}

			public void SetButtonState(PointerEventData.InputButton button, PointerEventData.FramePressState stateForMouseButton, PointerEventData data)
			{
				ButtonState buttonState = GetButtonState(button);
				buttonState.eventData.buttonState = stateForMouseButton;
				buttonState.eventData.buttonData = data;
			}
		}

		public class MouseButtonEventData
		{
			public PointerEventData.FramePressState buttonState;

			public PointerEventData buttonData;

			public bool PressedThisFrame()
			{
				return buttonState == PointerEventData.FramePressState.Pressed || buttonState == PointerEventData.FramePressState.PressedAndReleased;
			}

			public bool ReleasedThisFrame()
			{
				return buttonState == PointerEventData.FramePressState.Released || buttonState == PointerEventData.FramePressState.PressedAndReleased;
			}
		}

		public const int kMouseLeftId = -1;

		public const int kMouseRightId = -2;

		public const int kMouseMiddleId = -3;

		public const int kFakeTouchesId = -4;

		protected Dictionary<int, PointerEventData> m_PointerData = new Dictionary<int, PointerEventData>();

		private readonly MouseState m_MouseState = new MouseState();

		protected bool GetPointerData(int id, out PointerEventData data, bool create)
		{
			if (!m_PointerData.TryGetValue(id, out data) && create)
			{
				data = new PointerEventData(base.eventSystem)
				{
					pointerId = id
				};
				m_PointerData.Add(id, data);
				return true;
			}
			return false;
		}

		protected void RemovePointerData(PointerEventData data)
		{
			m_PointerData.Remove(data.pointerId);
		}

		protected PointerEventData GetTouchPointerEventData(Touch input, out bool pressed, out bool released)
		{
			PointerEventData data;
			bool pointerData = GetPointerData(input.fingerId, out data, true);
			data.Reset();
			pressed = pointerData || input.phase == TouchPhase.Began;
			released = input.phase == TouchPhase.Canceled || input.phase == TouchPhase.Ended;
			if (pointerData)
			{
				data.position = input.position;
			}
			if (pressed)
			{
				data.delta = Vector2.zero;
			}
			else
			{
				data.delta = input.position - data.position;
			}
			data.position = input.position;
			data.button = PointerEventData.InputButton.Left;
			base.eventSystem.RaycastAll(data, m_RaycastResultCache);
			RaycastResult pointerCurrentRaycast = BaseInputModule.FindFirstRaycast(m_RaycastResultCache);
			data.pointerCurrentRaycast = pointerCurrentRaycast;
			m_RaycastResultCache.Clear();
			return data;
		}

		protected void CopyFromTo(PointerEventData from, PointerEventData to)
		{
			to.position = from.position;
			to.delta = from.delta;
			to.scrollDelta = from.scrollDelta;
			to.pointerCurrentRaycast = from.pointerCurrentRaycast;
			to.pointerEnter = from.pointerEnter;
		}

		protected static PointerEventData.FramePressState StateForMouseButton(int buttonId)
		{
			bool mouseButtonDown = Input.GetMouseButtonDown(buttonId);
			bool mouseButtonUp = Input.GetMouseButtonUp(buttonId);
			if (mouseButtonDown && mouseButtonUp)
			{
				return PointerEventData.FramePressState.PressedAndReleased;
			}
			if (mouseButtonDown)
			{
				return PointerEventData.FramePressState.Pressed;
			}
			if (mouseButtonUp)
			{
				return PointerEventData.FramePressState.Released;
			}
			return PointerEventData.FramePressState.NotChanged;
		}

		protected virtual MouseState GetMousePointerEventData()
		{
			return GetMousePointerEventData(0);
		}

		protected virtual MouseState GetMousePointerEventData(int id)
		{
			PointerEventData data;
			bool pointerData = GetPointerData(-1, out data, true);
			data.Reset();
			if (pointerData)
			{
				data.position = Input.mousePosition;
			}
			Vector2 vector = Input.mousePosition;
			if (Cursor.lockState == CursorLockMode.Locked)
			{
				data.position = new Vector2(-1f, -1f);
				data.delta = Vector2.zero;
			}
			else
			{
				data.delta = vector - data.position;
				data.position = vector;
			}
			data.scrollDelta = Input.mouseScrollDelta;
			data.button = PointerEventData.InputButton.Left;
			base.eventSystem.RaycastAll(data, m_RaycastResultCache);
			RaycastResult pointerCurrentRaycast = BaseInputModule.FindFirstRaycast(m_RaycastResultCache);
			data.pointerCurrentRaycast = pointerCurrentRaycast;
			m_RaycastResultCache.Clear();
			PointerEventData data2;
			GetPointerData(-2, out data2, true);
			CopyFromTo(data, data2);
			data2.button = PointerEventData.InputButton.Right;
			PointerEventData data3;
			GetPointerData(-3, out data3, true);
			CopyFromTo(data, data3);
			data3.button = PointerEventData.InputButton.Middle;
			m_MouseState.SetButtonState(PointerEventData.InputButton.Left, StateForMouseButton(0), data);
			m_MouseState.SetButtonState(PointerEventData.InputButton.Right, StateForMouseButton(1), data2);
			m_MouseState.SetButtonState(PointerEventData.InputButton.Middle, StateForMouseButton(2), data3);
			return m_MouseState;
		}

		protected PointerEventData GetLastPointerEventData(int id)
		{
			PointerEventData data;
			GetPointerData(id, out data, false);
			return data;
		}

		private static bool ShouldStartDrag(Vector2 pressPos, Vector2 currentPos, float threshold, bool useDragThreshold)
		{
			if (!useDragThreshold)
			{
				return true;
			}
			return (pressPos - currentPos).sqrMagnitude >= threshold * threshold;
		}

		protected virtual void ProcessMove(PointerEventData pointerEvent)
		{
			GameObject newEnterTarget = pointerEvent.pointerCurrentRaycast.gameObject;
			HandlePointerExitAndEnter(pointerEvent, newEnterTarget);
		}

		protected virtual void ProcessDrag(PointerEventData pointerEvent)
		{
			bool flag = pointerEvent.IsPointerMoving();
			if (flag && pointerEvent.pointerDrag != null && !pointerEvent.dragging && ShouldStartDrag(pointerEvent.pressPosition, pointerEvent.position, base.eventSystem.pixelDragThreshold, pointerEvent.useDragThreshold))
			{
				ExecuteEvents.Execute(pointerEvent.pointerDrag, pointerEvent, ExecuteEvents.beginDragHandler);
				pointerEvent.dragging = true;
			}
			if (pointerEvent.dragging && flag && pointerEvent.pointerDrag != null)
			{
				if (pointerEvent.pointerPress != pointerEvent.pointerDrag)
				{
					ExecuteEvents.Execute(pointerEvent.pointerPress, pointerEvent, ExecuteEvents.pointerUpHandler);
					pointerEvent.eligibleForClick = false;
					pointerEvent.pointerPress = null;
					pointerEvent.rawPointerPress = null;
				}
				ExecuteEvents.Execute(pointerEvent.pointerDrag, pointerEvent, ExecuteEvents.dragHandler);
			}
		}

		public override bool IsPointerOverGameObject(int pointerId)
		{
			PointerEventData lastPointerEventData = GetLastPointerEventData(pointerId);
			if (lastPointerEventData != null)
			{
				return lastPointerEventData.pointerEnter != null;
			}
			return false;
		}

		protected void ClearSelection()
		{
			BaseEventData baseEventData = GetBaseEventData();
			foreach (PointerEventData value in m_PointerData.Values)
			{
				HandlePointerExitAndEnter(value, null);
			}
			m_PointerData.Clear();
			base.eventSystem.SetSelectedGameObject(null, baseEventData);
		}

		public override string ToString()
		{
			StringBuilder stringBuilder = new StringBuilder("<b>Pointer Input Module of type: </b>" + GetType());
			stringBuilder.AppendLine();
			foreach (KeyValuePair<int, PointerEventData> pointerDatum in m_PointerData)
			{
				if (pointerDatum.Value != null)
				{
					stringBuilder.AppendLine("<B>Pointer:</b> " + pointerDatum.Key);
					stringBuilder.AppendLine(pointerDatum.Value.ToString());
				}
			}
			return stringBuilder.ToString();
		}

		protected void DeselectIfSelectionChanged(GameObject currentOverGo, BaseEventData pointerEvent)
		{
			GameObject eventHandler = ExecuteEvents.GetEventHandler<ISelectHandler>(currentOverGo);
			if (eventHandler != base.eventSystem.currentSelectedGameObject)
			{
				base.eventSystem.SetSelectedGameObject(null, pointerEvent);
			}
		}
	}
}
