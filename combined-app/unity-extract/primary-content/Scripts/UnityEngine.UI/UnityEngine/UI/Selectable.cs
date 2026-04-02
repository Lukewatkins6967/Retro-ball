using System;
using System.Collections.Generic;
using UnityEngine.EventSystems;
using UnityEngine.Serialization;

namespace UnityEngine.UI
{
	[DisallowMultipleComponent]
	[AddComponentMenu("UI/Selectable", 70)]
	[ExecuteInEditMode]
	[SelectionBase]
	public class Selectable : UIBehaviour, IEventSystemHandler, IPointerEnterHandler, IPointerExitHandler, IPointerDownHandler, IPointerUpHandler, ISelectHandler, IDeselectHandler, IMoveHandler
	{
		public enum Transition
		{
			None = 0,
			ColorTint = 1,
			SpriteSwap = 2,
			Animation = 3
		}

		protected enum SelectionState
		{
			Normal = 0,
			Highlighted = 1,
			Pressed = 2,
			Disabled = 3
		}

		private static List<Selectable> s_List = new List<Selectable>();

		[FormerlySerializedAs("navigation")]
		[SerializeField]
		private Navigation m_Navigation = Navigation.defaultNavigation;

		[SerializeField]
		[FormerlySerializedAs("transition")]
		private Transition m_Transition = Transition.ColorTint;

		[SerializeField]
		[FormerlySerializedAs("colors")]
		private ColorBlock m_Colors = ColorBlock.defaultColorBlock;

		[FormerlySerializedAs("spriteState")]
		[SerializeField]
		private SpriteState m_SpriteState;

		[FormerlySerializedAs("animationTriggers")]
		[SerializeField]
		private AnimationTriggers m_AnimationTriggers = new AnimationTriggers();

		[SerializeField]
		[Tooltip("Can the Selectable be interacted with?")]
		private bool m_Interactable = true;

		[FormerlySerializedAs("highlightGraphic")]
		[FormerlySerializedAs("m_HighlightGraphic")]
		[SerializeField]
		private Graphic m_TargetGraphic;

		private bool m_GroupsAllowInteraction = true;

		private SelectionState m_CurrentSelectionState;

		private readonly List<CanvasGroup> m_CanvasGroupCache = new List<CanvasGroup>();

		public static List<Selectable> allSelectables
		{
			get
			{
				return s_List;
			}
		}

		public Navigation navigation
		{
			get
			{
				return m_Navigation;
			}
			set
			{
				if (SetPropertyUtility.SetEquatableStruct(ref m_Navigation, value))
				{
					OnSetProperty();
				}
			}
		}

		public Transition transition
		{
			get
			{
				return m_Transition;
			}
			set
			{
				if (SetPropertyUtility.SetStruct(ref m_Transition, value))
				{
					OnSetProperty();
				}
			}
		}

		public ColorBlock colors
		{
			get
			{
				return m_Colors;
			}
			set
			{
				if (SetPropertyUtility.SetEquatableStruct(ref m_Colors, value))
				{
					OnSetProperty();
				}
			}
		}

		public SpriteState spriteState
		{
			get
			{
				return m_SpriteState;
			}
			set
			{
				if (SetPropertyUtility.SetEquatableStruct(ref m_SpriteState, value))
				{
					OnSetProperty();
				}
			}
		}

		public AnimationTriggers animationTriggers
		{
			get
			{
				return m_AnimationTriggers;
			}
			set
			{
				if (SetPropertyUtility.SetClass(ref m_AnimationTriggers, value))
				{
					OnSetProperty();
				}
			}
		}

		public Graphic targetGraphic
		{
			get
			{
				return m_TargetGraphic;
			}
			set
			{
				if (SetPropertyUtility.SetClass(ref m_TargetGraphic, value))
				{
					OnSetProperty();
				}
			}
		}

		public bool interactable
		{
			get
			{
				return m_Interactable;
			}
			set
			{
				if (SetPropertyUtility.SetStruct(ref m_Interactable, value))
				{
					if (!m_Interactable && EventSystem.current != null && EventSystem.current.currentSelectedGameObject == base.gameObject)
					{
						EventSystem.current.SetSelectedGameObject(null);
					}
					OnSetProperty();
				}
			}
		}

		private bool isPointerInside { get; set; }

		private bool isPointerDown { get; set; }

		private bool hasSelection { get; set; }

		public Image image
		{
			get
			{
				return m_TargetGraphic as Image;
			}
			set
			{
				m_TargetGraphic = value;
			}
		}

		public Animator animator
		{
			get
			{
				return GetComponent<Animator>();
			}
		}

		protected SelectionState currentSelectionState
		{
			get
			{
				return m_CurrentSelectionState;
			}
		}

		protected Selectable()
		{
		}

		protected override void Awake()
		{
			if (m_TargetGraphic == null)
			{
				m_TargetGraphic = GetComponent<Graphic>();
			}
		}

		protected override void OnCanvasGroupChanged()
		{
			bool flag = true;
			Transform parent = base.transform;
			while (parent != null)
			{
				parent.GetComponents(m_CanvasGroupCache);
				bool flag2 = false;
				for (int i = 0; i < m_CanvasGroupCache.Count; i++)
				{
					if (!m_CanvasGroupCache[i].interactable)
					{
						flag = false;
						flag2 = true;
					}
					if (m_CanvasGroupCache[i].ignoreParentGroups)
					{
						flag2 = true;
					}
				}
				if (flag2)
				{
					break;
				}
				parent = parent.parent;
			}
			if (flag != m_GroupsAllowInteraction)
			{
				m_GroupsAllowInteraction = flag;
				OnSetProperty();
			}
		}

		public virtual bool IsInteractable()
		{
			return m_GroupsAllowInteraction && m_Interactable;
		}

		protected override void OnDidApplyAnimationProperties()
		{
			OnSetProperty();
		}

		protected override void OnEnable()
		{
			base.OnEnable();
			s_List.Add(this);
			SelectionState selectionState = SelectionState.Normal;
			if (hasSelection)
			{
				selectionState = SelectionState.Highlighted;
			}
			m_CurrentSelectionState = selectionState;
			InternalEvaluateAndTransitionToSelectionState(true);
		}

		private void OnSetProperty()
		{
			InternalEvaluateAndTransitionToSelectionState(false);
		}

		protected override void OnDisable()
		{
			s_List.Remove(this);
			InstantClearState();
			base.OnDisable();
		}

		protected virtual void InstantClearState()
		{
			string normalTrigger = m_AnimationTriggers.normalTrigger;
			isPointerInside = false;
			isPointerDown = false;
			hasSelection = false;
			switch (m_Transition)
			{
			case Transition.ColorTint:
				StartColorTween(Color.white, true);
				break;
			case Transition.SpriteSwap:
				DoSpriteSwap(null);
				break;
			case Transition.Animation:
				TriggerAnimation(normalTrigger);
				break;
			}
		}

		protected virtual void DoStateTransition(SelectionState state, bool instant)
		{
			Color color;
			Sprite newSprite;
			string triggername;
			switch (state)
			{
			case SelectionState.Normal:
				color = m_Colors.normalColor;
				newSprite = null;
				triggername = m_AnimationTriggers.normalTrigger;
				break;
			case SelectionState.Highlighted:
				color = m_Colors.highlightedColor;
				newSprite = m_SpriteState.highlightedSprite;
				triggername = m_AnimationTriggers.highlightedTrigger;
				break;
			case SelectionState.Pressed:
				color = m_Colors.pressedColor;
				newSprite = m_SpriteState.pressedSprite;
				triggername = m_AnimationTriggers.pressedTrigger;
				break;
			case SelectionState.Disabled:
				color = m_Colors.disabledColor;
				newSprite = m_SpriteState.disabledSprite;
				triggername = m_AnimationTriggers.disabledTrigger;
				break;
			default:
				color = Color.black;
				newSprite = null;
				triggername = string.Empty;
				break;
			}
			if (base.gameObject.activeInHierarchy)
			{
				switch (m_Transition)
				{
				case Transition.ColorTint:
					StartColorTween(color * m_Colors.colorMultiplier, instant);
					break;
				case Transition.SpriteSwap:
					DoSpriteSwap(newSprite);
					break;
				case Transition.Animation:
					TriggerAnimation(triggername);
					break;
				}
			}
		}

		public Selectable FindSelectable(Vector3 dir)
		{
			dir = dir.normalized;
			Vector3 vector = Quaternion.Inverse(base.transform.rotation) * dir;
			Vector3 vector2 = base.transform.TransformPoint(GetPointOnRectEdge(base.transform as RectTransform, vector));
			float num = float.NegativeInfinity;
			Selectable result = null;
			for (int i = 0; i < s_List.Count; i++)
			{
				Selectable selectable = s_List[i];
				if (selectable == this || selectable == null || !selectable.IsInteractable() || selectable.navigation.mode == Navigation.Mode.None)
				{
					continue;
				}
				RectTransform rectTransform = selectable.transform as RectTransform;
				Vector3 position = ((!(rectTransform != null)) ? Vector3.zero : ((Vector3)rectTransform.rect.center));
				Vector3 rhs = selectable.transform.TransformPoint(position) - vector2;
				float num2 = Vector3.Dot(dir, rhs);
				if (!(num2 <= 0f))
				{
					float num3 = num2 / rhs.sqrMagnitude;
					if (num3 > num)
					{
						num = num3;
						result = selectable;
					}
				}
			}
			return result;
		}

		private static Vector3 GetPointOnRectEdge(RectTransform rect, Vector2 dir)
		{
			if (rect == null)
			{
				return Vector3.zero;
			}
			if (dir != Vector2.zero)
			{
				dir /= Mathf.Max(Mathf.Abs(dir.x), Mathf.Abs(dir.y));
			}
			dir = rect.rect.center + Vector2.Scale(rect.rect.size, dir * 0.5f);
			return dir;
		}

		private void Navigate(AxisEventData eventData, Selectable sel)
		{
			if (sel != null && sel.IsActive())
			{
				eventData.selectedObject = sel.gameObject;
			}
		}

		public virtual Selectable FindSelectableOnLeft()
		{
			if (m_Navigation.mode == Navigation.Mode.Explicit)
			{
				return m_Navigation.selectOnLeft;
			}
			if ((m_Navigation.mode & Navigation.Mode.Horizontal) != Navigation.Mode.None)
			{
				return FindSelectable(base.transform.rotation * Vector3.left);
			}
			return null;
		}

		public virtual Selectable FindSelectableOnRight()
		{
			if (m_Navigation.mode == Navigation.Mode.Explicit)
			{
				return m_Navigation.selectOnRight;
			}
			if ((m_Navigation.mode & Navigation.Mode.Horizontal) != Navigation.Mode.None)
			{
				return FindSelectable(base.transform.rotation * Vector3.right);
			}
			return null;
		}

		public virtual Selectable FindSelectableOnUp()
		{
			if (m_Navigation.mode == Navigation.Mode.Explicit)
			{
				return m_Navigation.selectOnUp;
			}
			if ((m_Navigation.mode & Navigation.Mode.Vertical) != Navigation.Mode.None)
			{
				return FindSelectable(base.transform.rotation * Vector3.up);
			}
			return null;
		}

		public virtual Selectable FindSelectableOnDown()
		{
			if (m_Navigation.mode == Navigation.Mode.Explicit)
			{
				return m_Navigation.selectOnDown;
			}
			if ((m_Navigation.mode & Navigation.Mode.Vertical) != Navigation.Mode.None)
			{
				return FindSelectable(base.transform.rotation * Vector3.down);
			}
			return null;
		}

		public virtual void OnMove(AxisEventData eventData)
		{
			switch (eventData.moveDir)
			{
			case MoveDirection.Right:
				Navigate(eventData, FindSelectableOnRight());
				break;
			case MoveDirection.Up:
				Navigate(eventData, FindSelectableOnUp());
				break;
			case MoveDirection.Left:
				Navigate(eventData, FindSelectableOnLeft());
				break;
			case MoveDirection.Down:
				Navigate(eventData, FindSelectableOnDown());
				break;
			}
		}

		private void StartColorTween(Color targetColor, bool instant)
		{
			if (!(m_TargetGraphic == null))
			{
				m_TargetGraphic.CrossFadeColor(targetColor, (!instant) ? m_Colors.fadeDuration : 0f, true, true);
			}
		}

		private void DoSpriteSwap(Sprite newSprite)
		{
			if (!(image == null))
			{
				image.overrideSprite = newSprite;
			}
		}

		private void TriggerAnimation(string triggername)
		{
			if (!(animator == null) && animator.isActiveAndEnabled && !(animator.runtimeAnimatorController == null) && !string.IsNullOrEmpty(triggername))
			{
				animator.ResetTrigger(m_AnimationTriggers.normalTrigger);
				animator.ResetTrigger(m_AnimationTriggers.pressedTrigger);
				animator.ResetTrigger(m_AnimationTriggers.highlightedTrigger);
				animator.ResetTrigger(m_AnimationTriggers.disabledTrigger);
				animator.SetTrigger(triggername);
			}
		}

		protected bool IsHighlighted(BaseEventData eventData)
		{
			if (!IsActive())
			{
				return false;
			}
			if (IsPressed())
			{
				return false;
			}
			bool flag = hasSelection;
			if (eventData is PointerEventData)
			{
				PointerEventData pointerEventData = eventData as PointerEventData;
				return flag | ((isPointerDown && !isPointerInside && pointerEventData.pointerPress == base.gameObject) || (!isPointerDown && isPointerInside && pointerEventData.pointerPress == base.gameObject) || (!isPointerDown && isPointerInside && pointerEventData.pointerPress == null));
			}
			return flag | isPointerInside;
		}

		[Obsolete("Is Pressed no longer requires eventData", false)]
		protected bool IsPressed(BaseEventData eventData)
		{
			return IsPressed();
		}

		protected bool IsPressed()
		{
			if (!IsActive())
			{
				return false;
			}
			return isPointerInside && isPointerDown;
		}

		protected void UpdateSelectionState(BaseEventData eventData)
		{
			if (IsPressed())
			{
				m_CurrentSelectionState = SelectionState.Pressed;
			}
			else if (IsHighlighted(eventData))
			{
				m_CurrentSelectionState = SelectionState.Highlighted;
			}
			else
			{
				m_CurrentSelectionState = SelectionState.Normal;
			}
		}

		private void EvaluateAndTransitionToSelectionState(BaseEventData eventData)
		{
			if (IsActive())
			{
				UpdateSelectionState(eventData);
				InternalEvaluateAndTransitionToSelectionState(false);
			}
		}

		private void InternalEvaluateAndTransitionToSelectionState(bool instant)
		{
			SelectionState state = m_CurrentSelectionState;
			if (IsActive() && !IsInteractable())
			{
				state = SelectionState.Disabled;
			}
			DoStateTransition(state, instant);
		}

		public virtual void OnPointerDown(PointerEventData eventData)
		{
			if (eventData.button == PointerEventData.InputButton.Left)
			{
				if (IsInteractable() && navigation.mode != Navigation.Mode.None && EventSystem.current != null)
				{
					EventSystem.current.SetSelectedGameObject(base.gameObject, eventData);
				}
				isPointerDown = true;
				EvaluateAndTransitionToSelectionState(eventData);
			}
		}

		public virtual void OnPointerUp(PointerEventData eventData)
		{
			if (eventData.button == PointerEventData.InputButton.Left)
			{
				isPointerDown = false;
				EvaluateAndTransitionToSelectionState(eventData);
			}
		}

		public virtual void OnPointerEnter(PointerEventData eventData)
		{
			isPointerInside = true;
			EvaluateAndTransitionToSelectionState(eventData);
		}

		public virtual void OnPointerExit(PointerEventData eventData)
		{
			isPointerInside = false;
			EvaluateAndTransitionToSelectionState(eventData);
		}

		public virtual void OnSelect(BaseEventData eventData)
		{
			hasSelection = true;
			EvaluateAndTransitionToSelectionState(eventData);
		}

		public virtual void OnDeselect(BaseEventData eventData)
		{
			hasSelection = false;
			EvaluateAndTransitionToSelectionState(eventData);
		}

		public virtual void Select()
		{
			if (!(EventSystem.current == null) && !EventSystem.current.alreadySelecting)
			{
				EventSystem.current.SetSelectedGameObject(base.gameObject);
			}
		}
	}
}
