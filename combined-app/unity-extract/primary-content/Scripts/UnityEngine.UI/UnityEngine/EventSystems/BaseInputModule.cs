using System;
using System.Collections.Generic;

namespace UnityEngine.EventSystems
{
	[RequireComponent(typeof(EventSystem))]
	public abstract class BaseInputModule : UIBehaviour
	{
		[NonSerialized]
		protected List<RaycastResult> m_RaycastResultCache = new List<RaycastResult>();

		private AxisEventData m_AxisEventData;

		private EventSystem m_EventSystem;

		private BaseEventData m_BaseEventData;

		protected EventSystem eventSystem
		{
			get
			{
				return m_EventSystem;
			}
		}

		protected override void OnEnable()
		{
			base.OnEnable();
			m_EventSystem = GetComponent<EventSystem>();
			m_EventSystem.UpdateModules();
		}

		protected override void OnDisable()
		{
			m_EventSystem.UpdateModules();
			base.OnDisable();
		}

		public abstract void Process();

		protected static RaycastResult FindFirstRaycast(List<RaycastResult> candidates)
		{
			for (int i = 0; i < candidates.Count; i++)
			{
				if (!(candidates[i].gameObject == null))
				{
					return candidates[i];
				}
			}
			return default(RaycastResult);
		}

		protected static MoveDirection DetermineMoveDirection(float x, float y)
		{
			return DetermineMoveDirection(x, y, 0.6f);
		}

		protected static MoveDirection DetermineMoveDirection(float x, float y, float deadZone)
		{
			if (new Vector2(x, y).sqrMagnitude < deadZone * deadZone)
			{
				return MoveDirection.None;
			}
			if (Mathf.Abs(x) > Mathf.Abs(y))
			{
				if (x > 0f)
				{
					return MoveDirection.Right;
				}
				return MoveDirection.Left;
			}
			if (y > 0f)
			{
				return MoveDirection.Up;
			}
			return MoveDirection.Down;
		}

		protected static GameObject FindCommonRoot(GameObject g1, GameObject g2)
		{
			if (g1 == null || g2 == null)
			{
				return null;
			}
			Transform parent = g1.transform;
			while (parent != null)
			{
				Transform parent2 = g2.transform;
				while (parent2 != null)
				{
					if (parent == parent2)
					{
						return parent.gameObject;
					}
					parent2 = parent2.parent;
				}
				parent = parent.parent;
			}
			return null;
		}

		protected void HandlePointerExitAndEnter(PointerEventData currentPointerData, GameObject newEnterTarget)
		{
			if (newEnterTarget == null || currentPointerData.pointerEnter == null)
			{
				for (int i = 0; i < currentPointerData.hovered.Count; i++)
				{
					ExecuteEvents.Execute(currentPointerData.hovered[i], currentPointerData, ExecuteEvents.pointerExitHandler);
				}
				currentPointerData.hovered.Clear();
				if (newEnterTarget == null)
				{
					currentPointerData.pointerEnter = newEnterTarget;
					return;
				}
			}
			if (currentPointerData.pointerEnter == newEnterTarget && (bool)newEnterTarget)
			{
				return;
			}
			GameObject gameObject = FindCommonRoot(currentPointerData.pointerEnter, newEnterTarget);
			if (currentPointerData.pointerEnter != null)
			{
				Transform parent = currentPointerData.pointerEnter.transform;
				while (parent != null && (!(gameObject != null) || !(gameObject.transform == parent)))
				{
					ExecuteEvents.Execute(parent.gameObject, currentPointerData, ExecuteEvents.pointerExitHandler);
					currentPointerData.hovered.Remove(parent.gameObject);
					parent = parent.parent;
				}
			}
			currentPointerData.pointerEnter = newEnterTarget;
			if (newEnterTarget != null)
			{
				Transform parent2 = newEnterTarget.transform;
				while (parent2 != null && parent2.gameObject != gameObject)
				{
					ExecuteEvents.Execute(parent2.gameObject, currentPointerData, ExecuteEvents.pointerEnterHandler);
					currentPointerData.hovered.Add(parent2.gameObject);
					parent2 = parent2.parent;
				}
			}
		}

		protected virtual AxisEventData GetAxisEventData(float x, float y, float moveDeadZone)
		{
			if (m_AxisEventData == null)
			{
				m_AxisEventData = new AxisEventData(eventSystem);
			}
			m_AxisEventData.Reset();
			m_AxisEventData.moveVector = new Vector2(x, y);
			m_AxisEventData.moveDir = DetermineMoveDirection(x, y, moveDeadZone);
			return m_AxisEventData;
		}

		protected virtual BaseEventData GetBaseEventData()
		{
			if (m_BaseEventData == null)
			{
				m_BaseEventData = new BaseEventData(eventSystem);
			}
			m_BaseEventData.Reset();
			return m_BaseEventData;
		}

		public virtual bool IsPointerOverGameObject(int pointerId)
		{
			return false;
		}

		public virtual bool ShouldActivateModule()
		{
			return base.enabled && base.gameObject.activeInHierarchy;
		}

		public virtual void DeactivateModule()
		{
		}

		public virtual void ActivateModule()
		{
		}

		public virtual void UpdateModule()
		{
		}

		public virtual bool IsModuleSupported()
		{
			return true;
		}
	}
}
