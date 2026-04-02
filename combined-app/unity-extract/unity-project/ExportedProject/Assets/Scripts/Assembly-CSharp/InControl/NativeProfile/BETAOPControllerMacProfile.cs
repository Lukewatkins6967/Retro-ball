namespace InControl.NativeProfile
{
	public class BETAOPControllerMacProfile : Xbox360DriverMacProfile
	{
		public BETAOPControllerMacProfile()
		{
			base.Name = "BETAOP Controller";
			base.Meta = "BETAOP Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)4544,
					ProductID = (ushort)21766
				}
			};
		}
	}
}
