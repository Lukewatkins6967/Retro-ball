using System;
using System.Collections.Generic;
using UnityEngine.EventSystems;
using UnityEngine.Serialization;

namespace UnityEngine.UI
{
	[RequireComponent(typeof(RectTransform))]
	[DisallowMultipleComponent]
	[ExecuteInEditMode]
	public abstract class LayoutGroup : UIBehaviour, ILayoutElement, ILayoutController, ILayoutGroup
	{
		[SerializeField]
		protected RectOffset m_Padding = new RectOffset();

		[SerializeField]
		[FormerlySerializedAs("m_Alignment")]
		protected TextAnchor m_ChildAlignment;

		[NonSerialized]
		private RectTransform m_Rect;

		protected DrivenRectTransformTracker m_Tracker;

		private Vector2 m_TotalMinSize = Vector2.zero;

		private Vector2 m_TotalPreferredSize = Vector2.zero;

		private Vector2 m_TotalFlexibleSize = Vector2.zero;

		[NonSerialized]
		private List<RectTransform> m_RectChildren = new List<RectTransform>();

		public RectOffset padding
		{
			get
			{
				return m_Padding;
			}
			set
			{
				SetProperty(ref m_Padding, value);
			}
		}

		public TextAnchor childAlignment
		{
			get
			{
				return m_ChildAlignment;
			}
			set
			{
				SetProperty(ref m_ChildAlignment, value);
			}
		}

		protected RectTransform rectTransform
		{
			get
			{
				if (m_Rect == null)
				{
					m_Rect = GetComponent<RectTransform>();
				}
				return m_Rect;
			}
		}

		protected List<RectTransform> rectChildren
		{
			get
			{
				return m_RectChildren;
			}
		}

		public virtual float minWidth
		{
			get
			{
				return GetTotalMinSize(0);
			}
		}

		public virtual float preferredWidth
		{
			get
			{
				return GetTotalPreferredSize(0);
			}
		}

		public virtual float flexibleWidth
		{
			get
			{
				return GetTotalFlexibleSize(0);
			}
		}

		public virtual float minHeight
		{
			get
			{
				return GetTotalMinSize(1);
			}
		}

		public virtual float preferredHeight
		{
			get
			{
				return GetTotalPreferredSize(1);
			}
		}

		public virtual float flexibleHeight
		{
			get
			{
				return GetTotalFlexibleSize(1);
			}
		}

		public virtual int layoutPriority
		{
			get
			{
				return 0;
			}
		}

		private bool isRootLayoutGroup
		{
			get
			{
				Transform parent = base.transform.parent;
				if (parent == null)
				{
					return true;
				}
				return base.transform.parent.GetComponent(typeof(ILayoutGroup)) == null;
			}
		}

		protected LayoutGroup()
		{
			if (m_Padding == null)
			{
				m_Padding = new RectOffset();
			}
		}

		public virtual void CalculateLayoutInputHorizontal()
		{
			m_RectChildren.Clear();
			List<Component> list = ListPool<Component>.Get();
			for (int i = 0; i < this.rectTransform.childCount; i++)
			{
				RectTransform rectTransform = this.rectTransform.GetChild(i) as RectTransform;
				if (rectTransform == null || !rectTransform.gameObject.activeInHierarchy)
				{
					continue;
				}
				rectTransform.GetComponents(typeof(ILayoutIgnorer), list);
				if (list.Count == 0)
				{
					m_RectChildren.Add(rectTransform);
					continue;
				}
				for (int j = 0; j < list.Count; j++)
				{
					ILayoutIgnorer layoutIgnorer = (ILayoutIgnorer)list[j];
					if (!layoutIgnorer.ignoreLayout)
					{
						m_RectChildren.Add(rectTransform);
						break;
					}
				}
			}
			ListPool<Component>.Release(list);
			m_Tracker.Clear();
		}

		public abstract void CalculateLayoutInputVertical();

		public abstract void SetLayoutHorizontal();

		public abstract void SetLayoutVertical();

		protected override void OnEnable()
		{
			base.OnEnable();
			SetDirty();
		}

		protected override void OnDisable()
		{
			m_Tracker.Clear();
			LayoutRebuilder.MarkLayoutForRebuild(rectTransform);
			base.OnDisable();
		}

		protected override void OnDidApplyAnimationProperties()
		{
			SetDirty();
		}

		protected float GetTotalMinSize(int axis)
		{
			return m_TotalMinSize[axis];
		}

		protected float GetTotalPreferredSize(int axis)
		{
			return m_TotalPreferredSize[axis];
		}

		protected float GetTotalFlexibleSize(int axis)
		{
			return m_TotalFlexibleSize[axis];
		}

		protected float GetStartOffset(int axis, float requiredSpaceWithoutPadding)
		{
			float num = requiredSpaceWithoutPadding + (float)((axis != 0) ? padding.vertical : padding.horizontal);
			float num2 = rectTransform.rect.size[axis];
			float num3 = num2 - num;
			float num4 = 0f;
			num4 = ((axis != 0) ? ((float)((int)childAlignment / 3) * 0.5f) : ((float)((int)childAlignment % 3) * 0.5f));
			return (float)((axis != 0) ? padding.top : padding.left) + num3 * num4;
		}

		protected void SetLayoutInputForAxis(float totalMin, float totalPreferred, float totalFlexible, int axis)
		{
			m_TotalMinSize[axis] = totalMin;
			m_TotalPreferredSize[axis] = totalPreferred;
			m_TotalFlexibleSize[axis] = totalFlexible;
		}

		protected void SetChildAlongAxis(RectTransform rect, int axis, float pos, float size)
		{
			if (!(rect == null))
			{
				m_Tracker.Add(this, rect, DrivenTransformProperties.Anchors | DrivenTransformProperties.AnchoredPosition | DrivenTransformProperties.SizeDelta);
				rect.SetInsetAndSizeFromParentEdge((axis != 0) ? RectTransform.Edge.Top : RectTransform.Edge.Left, pos, size);
			}
		}

		protected override void OnRectTransformDimensionsChange()
		{
			base.OnRectTransformDimensionsChange();
			if (isRootLayoutGroup)
			{
				SetDirty();
			}
		}

		protected virtual void OnTransformChildrenChanged()
		{
			SetDirty();
		}

		protected void SetProperty<T>(ref T currentValue, T newValue)
		{
			if ((currentValue != null || newValue != null) && (currentValue == null || !currentValue.Equals(newValue)))
			{
				currentValue = newValue;
				SetDirty();
			}
		}

		protected void SetDirty()
		{
			if (IsActive())
			{
				LayoutRebuilder.MarkLayoutForRebuild(rectTransform);
			}
		}
	}
}
