using UnityEngine;
using UnityEngine.UI;

public class FillBar : MonoBehaviour
{
	[SerializeField]
	private ParticleSystem m_fillParticleSystem;

	[SerializeField]
	private Image m_fillImage;

	[SerializeField]
	private Image m_fillInsideImage;

	[SerializeField]
	private float m_fillSpeed = 1.5f;

	private Animator m_animator;

	private float m_fill;

	private float m_targetFill;

	private float m_insideFill;

	private float m_targetInsideFill;

	private bool m_animatedFill;

	private bool m_tweenBars = true;

	public Image GetFillImage()
	{
		return m_fillImage;
	}

	public float GetFill()
	{
		return m_fill;
	}

	public void SetFill(float fill)
	{
		m_fill = fill;
		m_targetFill = fill;
		m_insideFill = fill;
		m_targetInsideFill = fill;
	}

	public void SetTargetFill(float targetFill)
	{
		if (m_targetFill == targetFill)
		{
			return;
		}
		if (targetFill > m_fill)
		{
			if (m_tweenBars && (bool)m_animator && targetFill - m_fill > 0.05f && !m_animatedFill)
			{
				m_animatedFill = true;
				m_animator.Play("BuildUp", -1, 0f);
				m_tweenBars = false;
				m_fillInsideImage.gameObject.SetActive(false);
			}
			m_targetFill = targetFill;
			m_insideFill = (m_targetInsideFill = targetFill);
		}
		else if (targetFill < m_fill)
		{
			m_targetInsideFill = targetFill;
			m_fill = (m_targetFill = targetFill);
		}
	}

	public void AnimHideBars()
	{
		m_fillImage.gameObject.SetActive(false);
		m_fillInsideImage.gameObject.SetActive(false);
	}

	public void AnimShowBars()
	{
		m_fillImage.gameObject.SetActive(true);
		m_fillInsideImage.gameObject.SetActive(true);
		m_tweenBars = true;
	}

	private void Awake()
	{
		m_animator = GetComponent<Animator>();
		if (!m_animator)
		{
			m_animator = GetComponentInParent<Animator>();
		}
	}

	private void Update()
	{
		RectTransform component = GetComponent<RectTransform>();
		if (m_tweenBars)
		{
			m_fill = Mathf.MoveTowards(m_fill, m_targetFill, m_fillSpeed * Time.deltaTime);
			m_insideFill = Mathf.MoveTowards(m_insideFill, m_targetInsideFill, m_fillSpeed * Time.deltaTime);
		}
		if (m_animatedFill && m_fill == m_targetFill)
		{
			m_animatedFill = false;
			m_animator.Play("Finished", -1, 0f);
		}
		if ((bool)m_fillParticleSystem)
		{
			ParticleSystem.EmissionModule emission = m_fillParticleSystem.emission;
			if (m_animatedFill)
			{
				emission.enabled = true;
			}
			else
			{
				emission.enabled = false;
			}
			RectTransform component2 = m_fillParticleSystem.GetComponent<RectTransform>();
			component2.anchoredPosition = component2.anchoredPosition.WithX(component.rect.width * m_fill);
		}
		m_fillImage.rectTransform.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, component.rect.width * m_fill);
		if ((bool)m_fillInsideImage)
		{
			m_fillInsideImage.rectTransform.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, component.rect.width * m_insideFill);
		}
	}

	private void OnDisable()
	{
		if (m_animatedFill)
		{
			m_tweenBars = true;
			m_animatedFill = false;
			m_fill = m_targetFill;
			m_insideFill = m_targetInsideFill;
		}
	}
}
